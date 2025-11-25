/**
 * Generic Query Route
 *
 * Endpoint para ejecutar queries SQL SELECT genéricos contra Firebird.
 * Usado por el servicio de LLM Analytics para ejecutar SQL generado por IA.
 *
 * Seguridad:
 * - Requiere autenticación via API Key
 * - Solo permite queries SELECT
 * - Timeout de 30 segundos
 * - Validación de syntax SQL básica
 */

const express = require('express');
const router = express.Router();
const firebird = require('../firebird');

/**
 * POST /api/query
 *
 * Ejecuta una query SQL SELECT contra la base de datos Firebird
 *
 * Body:
 * {
 *   "sql": "SELECT * FROM PRODUCTOS WHERE PRECIO > 100",
 *   "params": []  // opcional, para queries parametrizadas
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "results": [...],
 *   "rowCount": 10,
 *   "executionTime": 125
 * }
 */
router.post('/', async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { sql, params = [] } = req.body;

    // ===========================
    // VALIDACIONES
    // ===========================

    // 1. Verificar que SQL existe
    if (!sql) {
      return res.status(400).json({
        success: false,
        error: 'SQL query is required',
        code: 'MISSING_SQL'
      });
    }

    // 2. Verificar que sea string
    if (typeof sql !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'SQL must be a string',
        code: 'INVALID_SQL_TYPE'
      });
    }

    // 3. Verificar longitud máxima (5KB)
    if (sql.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'SQL query is too long (max 5000 characters)',
        code: 'SQL_TOO_LONG'
      });
    }

    // 4. Normalizar SQL
    const normalizedSQL = sql.trim();

    // 5. Verificar que sea SELECT (seguridad crítica)
    const upperSQL = normalizedSQL.toUpperCase();
    if (!upperSQL.startsWith('SELECT')) {
      return res.status(403).json({
        success: false,
        error: 'Only SELECT queries are allowed',
        code: 'FORBIDDEN_OPERATION',
        hint: 'This endpoint only accepts read-only SELECT statements'
      });
    }

    // 6. Verificar keywords peligrosos (defensa en profundidad)
    const dangerousKeywords = [
      'DROP', 'DELETE', 'UPDATE', 'INSERT', 'TRUNCATE',
      'ALTER', 'CREATE', 'GRANT', 'REVOKE', 'EXECUTE'
    ];

    for (const keyword of dangerousKeywords) {
      // Buscar keyword como palabra completa (no parte de otra palabra)
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(upperSQL)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden keyword detected: ${keyword}`,
          code: 'FORBIDDEN_KEYWORD'
        });
      }
    }

    // 7. Verificar funciones peligrosas de Firebird
    const dangerousFunctions = [
      'EXECUTE BLOCK',
      'EXECUTE STATEMENT',
      'EXECUTE PROCEDURE'
    ];

    for (const func of dangerousFunctions) {
      if (upperSQL.includes(func)) {
        return res.status(403).json({
          success: false,
          error: `Dangerous function detected: ${func}`,
          code: 'DANGEROUS_FUNCTION'
        });
      }
    }

    // 8. Validar params si existen
    if (params && !Array.isArray(params)) {
      return res.status(400).json({
        success: false,
        error: 'Params must be an array',
        code: 'INVALID_PARAMS_TYPE'
      });
    }

    // ===========================
    // EJECUCIÓN DE QUERY
    // ===========================

    console.log(`\n📊 Executing query:`, {
      sql: normalizedSQL.substring(0, 100) + (normalizedSQL.length > 100 ? '...' : ''),
      paramsCount: params.length,
      sqlLength: normalizedSQL.length
    });

    let results;
    try {
      // Ejecutar con timeout de 30 segundos
      results = await Promise.race([
        firebird.queryAsync(normalizedSQL, params),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout after 30 seconds')), 30000)
        )
      ]);
    } catch (queryError) {
      console.error('❌ Firebird query error:', queryError);

      // Mapear errores de Firebird a mensajes amigables
      let errorMessage = queryError.message || 'Query execution failed';
      let errorCode = 'QUERY_EXECUTION_ERROR';

      if (errorMessage.includes('timeout')) {
        errorMessage = 'Query timeout. Try simplifying your query or adding more specific filters.';
        errorCode = 'QUERY_TIMEOUT';
      } else if (errorMessage.includes('lock')) {
        errorMessage = 'Database is temporarily locked. Please try again in a moment.';
        errorCode = 'DATABASE_LOCKED';
      } else if (errorMessage.includes('connection')) {
        errorMessage = 'Database connection failed. Please contact support.';
        errorCode = 'CONNECTION_ERROR';
      } else if (errorMessage.includes('syntax')) {
        errorMessage = 'SQL syntax error. Please check your query syntax.';
        errorCode = 'SYNTAX_ERROR';
      } else if (errorMessage.includes('table') || errorMessage.includes('column')) {
        errorMessage = 'Table or column not found. Please verify table/column names.';
        errorCode = 'OBJECT_NOT_FOUND';
      }

      return res.status(500).json({
        success: false,
        error: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? queryError.message : undefined
      });
    }

    // ===========================
    // FORMATEO DE RESPUESTA
    // ===========================

    const executionTime = Date.now() - startTime;
    const rowCount = Array.isArray(results) ? results.length : 0;

    console.log(`✅ Query executed successfully:`, {
      rowCount,
      executionTime: `${executionTime}ms`
    });

    // Respuesta exitosa
    res.json({
      success: true,
      results: results || [],
      rowCount,
      executionTime,
      metadata: {
        timestamp: new Date().toISOString(),
        sqlLength: normalizedSQL.length,
        hasParams: params.length > 0
      }
    });

  } catch (error) {
    // Error inesperado (no debería llegar aquí normalmente)
    console.error('❌ Unexpected error in query endpoint:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/query/test
 *
 * Endpoint de prueba para verificar que el servicio funciona
 */
router.get('/test', async (req, res) => {
  try {
    // Query simple de prueba
    const testSQL = 'SELECT FIRST 1 CURRENT_TIMESTAMP as SERVIDOR_FECHA FROM RDB$DATABASE';
    const results = await firebird.queryAsync(testSQL);

    res.json({
      success: true,
      message: 'Query endpoint is working',
      serverTime: results[0]?.SERVIDOR_FECHA,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Query test failed',
      message: error.message
    });
  }
});

module.exports = router;
