/**
 * PDF Processor Service
 *
 * Procesa PDFs de forma segura con:
 * - Validación de firma PDF antes de procesar
 * - Timeout de 30 segundos
 * - Límite de 100 páginas máximo
 * - Chunking semántico con overlap
 * - Extracción de metadata (páginas, autor, fecha)
 * - Cleanup forzado de buffers para evitar memory leaks
 * - Manejo robusto de PDFs corruptos
 */

import pdfParse from 'pdf-parse';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { embeddingService, DocumentChunk } from './embedding-service';

// Tipos
export interface PDFMetadata {
  pages: number;
  title?: string;
  author?: string;
  creationDate?: Date;
  hasImages: boolean;
  producer?: string;
}

export interface PDFProcessResult {
  success: boolean;
  text?: string;
  metadata?: PDFMetadata;
  chunks?: DocumentChunk[];
  contentHash?: string;
  error?: string;
}

export interface PDFChunkWithEmbedding {
  chunk: DocumentChunk;
  embedding: number[];
  chunkIndex: number;
}

/**
 * Servicio para procesamiento seguro de PDFs
 */
export class PDFProcessor {
  private readonly MAX_SIZE_MB = parseInt(process.env.MAX_PDF_SIZE_MB || '50');
  private readonly MAX_PAGES = parseInt(process.env.MAX_PDF_PAGES || '100');
  private readonly TIMEOUT_MS = 30000; // 30 segundos
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: {
          schema: process.env.SUPABASE_SCHEMA || 'embler',
        },
      }
    );
  }

  /**
   * Procesar PDF completo: validación + extracción + chunking
   */
  async processPDF(
    fileBuffer: Buffer,
    filename: string
  ): Promise<PDFProcessResult> {
    console.log(`\n📄 Processing PDF: ${filename}`);

    try {
      // 1. Validar tamaño
      const sizeMB = fileBuffer.length / (1024 * 1024);
      if (sizeMB > this.MAX_SIZE_MB) {
        return {
          success: false,
          error: `PDF too large: ${sizeMB.toFixed(2)}MB (max ${this.MAX_SIZE_MB}MB)`,
        };
      }

      console.log(`  📊 Size: ${sizeMB.toFixed(2)}MB`);

      // 2. Validar firma PDF
      const signature = fileBuffer.toString('ascii', 0, 5);
      if (!signature.includes('%PDF')) {
        return {
          success: false,
          error: 'Invalid PDF signature - file is corrupted or not a PDF',
        };
      }

      console.log(`  ✅ Valid PDF signature`);

      // 3. Extraer texto con timeout
      const extractResult = await this.extractTextWithTimeout(fileBuffer);

      if (!extractResult.success) {
        return extractResult;
      }

      const { text, metadata } = extractResult;

      // 4. Validar páginas
      if (metadata!.pages > this.MAX_PAGES) {
        return {
          success: false,
          error: `PDF has too many pages: ${metadata!.pages} (max ${this.MAX_PAGES})`,
        };
      }

      console.log(`  📖 Pages: ${metadata!.pages}`);
      console.log(`  📝 Text length: ${text!.length} characters`);

      // 5. Generar hash del contenido para deduplicación
      const contentHash = crypto
        .createHash('sha256')
        .update(text!)
        .digest('hex');

      console.log(`  🔐 Content hash: ${contentHash.substring(0, 16)}...`);

      // 6. Chunking semántico
      console.log(`  ✂️  Chunking text...`);
      const chunks = embeddingService.chunkText(text!, {
        type: 'paragraph',
      });

      console.log(`  ✅ Created ${chunks.length} chunks`);

      // 7. Cleanup forzado
      this.forceCleanup(fileBuffer);

      return {
        success: true,
        text,
        metadata,
        chunks,
        contentHash,
      };
    } catch (error: any) {
      console.error(`  ❌ Error processing PDF:`, error.message);

      // Cleanup en caso de error
      this.forceCleanup(fileBuffer);

      return {
        success: false,
        error: `PDF processing failed: ${error.message}`,
      };
    }
  }

  /**
   * Extraer texto del PDF con timeout
   */
  private async extractTextWithTimeout(
    buffer: Buffer
  ): Promise<PDFProcessResult> {
    try {
      const data = await Promise.race([
        pdfParse(buffer, {
          max: this.MAX_PAGES, // Máximo de páginas a procesar
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF processing timeout')), this.TIMEOUT_MS)
        ),
      ]);

      // Validar que se extrajo texto
      if (!data.text || data.text.length === 0) {
        return {
          success: false,
          error: 'PDF contains no extractable text (might be scanned images)',
        };
      }

      // Extraer metadata
      const metadata: PDFMetadata = {
        pages: data.numpages,
        title: data.info?.Title,
        author: data.info?.Author,
        creationDate: data.info?.CreationDate
          ? new Date(data.info.CreationDate)
          : undefined,
        hasImages: false, // TODO: Detectar imágenes embebidas
        producer: data.info?.Producer,
      };

      return {
        success: true,
        text: data.text,
        metadata,
      };
    } catch (error: any) {
      // Categorizar errores
      if (error.message.includes('timeout')) {
        return {
          success: false,
          error: 'PDF processing timeout - file too large or too complex',
        };
      }

      if (error.message.includes('Invalid') || error.message.includes('parse')) {
        return {
          success: false,
          error: 'Corrupted or invalid PDF file',
        };
      }

      return {
        success: false,
        error: `PDF extraction failed: ${error.message}`,
      };
    }
  }

  /**
   * Generar embeddings para todos los chunks (usado por workers)
   */
  async generateEmbeddingsForChunks(
    chunks: DocumentChunk[]
  ): Promise<PDFChunkWithEmbedding[]> {
    console.log(`\n🧠 Generating embeddings for ${chunks.length} chunks...`);

    const results: PDFChunkWithEmbedding[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        const embedding = await embeddingService.generateEmbedding(chunk.text);

        results.push({
          chunk,
          embedding,
          chunkIndex: i,
        });

        // Log progreso cada 10 chunks
        if ((i + 1) % 10 === 0) {
          console.log(`  📊 Progress: ${i + 1}/${chunks.length} chunks processed`);
        }
      } catch (error: any) {
        console.error(`  ❌ Failed to generate embedding for chunk ${i}:`, error.message);
        throw error; // Fallar todo el proceso si falla un embedding
      }
    }

    console.log(`  ✅ All embeddings generated successfully`);
    return results;
  }

  /**
   * Guardar chunks procesados con embeddings en la base de datos
   */
  async saveChunksToDatabase(
    documentId: string,
    chunks: PDFChunkWithEmbedding[]
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`\n💾 Saving ${chunks.length} chunks to database...`);

    try {
      const { error } = await this.supabase
        .from('document_chunks')
        .insert(
          chunks.map((c) => ({
            document_id: documentId,
            content: c.chunk.text,
            embedding: c.embedding,
            tokens: c.chunk.tokens,
            chunk_index: c.chunkIndex,
            page_number: c.chunk.metadata?.pageNumber,
            section_title: c.chunk.metadata?.section,
            content_type: 'text',
            metadata: c.chunk.metadata || {},
          }))
        );

      if (error) {
        console.error(`  ❌ Failed to save chunks:`, error);
        return {
          success: false,
          error: `Failed to save chunks: ${error.message}`,
        };
      }

      console.log(`  ✅ ${chunks.length} chunks saved successfully`);
      return { success: true };
    } catch (error: any) {
      console.error(`  ❌ Error saving chunks:`, error.message);
      return {
        success: false,
        error: `Error saving chunks: ${error.message}`,
      };
    }
  }

  /**
   * Guardar metadata del documento en la base de datos
   */
  async saveDocumentMetadata(
    userId: string,
    filename: string,
    contentHash: string,
    fileSize: number,
    metadata: PDFMetadata
  ): Promise<{ success: boolean; documentId?: string; error?: string }> {
    console.log(`\n💾 Saving document metadata to database...`);

    try {
      const { data, error } = await this.supabase
        .from('documents')
        .insert({
          user_id: userId,
          filename,
          content_hash: contentHash,
          file_type: 'pdf',
          file_size_bytes: fileSize,
          processing_status: 'completed',
          processed_at: new Date().toISOString(),
          metadata: {
            pages: metadata.pages,
            title: metadata.title,
            author: metadata.author,
            creationDate: metadata.creationDate,
            hasImages: metadata.hasImages,
            producer: metadata.producer,
          },
        })
        .select('id')
        .single();

      if (error) {
        console.error(`  ❌ Failed to save document metadata:`, error);
        return {
          success: false,
          error: `Failed to save document metadata: ${error.message}`,
        };
      }

      console.log(`  ✅ Document metadata saved with ID: ${data.id}`);
      return {
        success: true,
        documentId: data.id,
      };
    } catch (error: any) {
      console.error(`  ❌ Error saving document metadata:`, error.message);
      return {
        success: false,
        error: `Error saving document metadata: ${error.message}`,
      };
    }
  }

  /**
   * Extraer metadata del PDF sin procesar el texto completo
   */
  async extractMetadataOnly(buffer: Buffer): Promise<{
    success: boolean;
    metadata?: PDFMetadata;
    error?: string;
  }> {
    try {
      // Validar firma
      const signature = buffer.toString('ascii', 0, 5);
      if (!signature.includes('%PDF')) {
        return {
          success: false,
          error: 'Invalid PDF signature',
        };
      }

      // Extraer solo metadata (sin texto)
      const data = await Promise.race([
        pdfParse(buffer, {
          max: 1, // Solo primera página para metadata
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        ),
      ]);

      const metadata: PDFMetadata = {
        pages: data.numpages,
        title: data.info?.Title,
        author: data.info?.Author,
        creationDate: data.info?.CreationDate
          ? new Date(data.info.CreationDate)
          : undefined,
        hasImages: false,
        producer: data.info?.Producer,
      };

      this.forceCleanup(buffer);

      return {
        success: true,
        metadata,
      };
    } catch (error: any) {
      this.forceCleanup(buffer);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validar PDF sin procesarlo completamente
   */
  async validatePDF(buffer: Buffer): Promise<{
    valid: boolean;
    error?: string;
    sizeMB: number;
  }> {
    const sizeMB = buffer.length / (1024 * 1024);

    // Validar tamaño
    if (sizeMB > this.MAX_SIZE_MB) {
      return {
        valid: false,
        error: `PDF too large: ${sizeMB.toFixed(2)}MB (max ${this.MAX_SIZE_MB}MB)`,
        sizeMB,
      };
    }

    // Validar firma
    const signature = buffer.toString('ascii', 0, 5);
    if (!signature.includes('%PDF')) {
      return {
        valid: false,
        error: 'Invalid PDF signature',
        sizeMB,
      };
    }

    // Intentar leer metadata rápidamente
    try {
      await Promise.race([
        pdfParse(buffer, { max: 1 }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        ),
      ]);

      this.forceCleanup(buffer);

      return {
        valid: true,
        sizeMB,
      };
    } catch (error: any) {
      this.forceCleanup(buffer);

      return {
        valid: false,
        error: `Invalid or corrupted PDF: ${error.message}`,
        sizeMB,
      };
    }
  }

  /**
   * Cleanup forzado de buffers para evitar memory leaks
   */
  private forceCleanup(buffer: Buffer | null) {
    try {
      // Intentar liberar el buffer
      buffer = null as any;

      // Force garbage collection si está disponible (require node --expose-gc)
      if (global.gc) {
        global.gc();
      }
    } catch (error) {
      // Ignorar errores de cleanup
    }
  }
}

// Singleton instance
export const pdfProcessor = new PDFProcessor();
