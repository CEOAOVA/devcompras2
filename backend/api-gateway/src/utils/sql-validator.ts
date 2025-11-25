/**
 * SQL Validator with AST Parsing
 *
 * Validador avanzado de SQL queries con parsing de AST para máxima seguridad:
 * - AST parsing para validación estructural
 * - Whitelist de tablas y operaciones
 * - Blacklist de keywords peligrosos
 * - Detección de SQL injection patterns
 * - Validación de syntax Firebird
 * - Añade límites automáticos si faltan
 *
 * SEGURIDAD:
 * ✅ SQL injection prevention (AST-based)
 * ✅ Whitelist enforcement
 * ✅ Dangerous operation blocking
 * ✅ Query complexity limits
 * ✅ Size limits
 */

import { Parser, type AST } from 'node-sql-parser';

// ========================
// CONFIGURACIÓN
// ========================

/**
 * Tablas permitidas (whitelist)
 */
export const ALLOWED_TABLES = [
  'PRODUCTOS',
  'VENTAS',
  'CLIENTES',
  'TIENDAS',
  'CATEGORIAS',
  'INVENTARIO',
];

/**
 * Operaciones SQL permitidas
 */
export const ALLOWED_OPERATIONS = [
  'SELECT',
];

/**
 * Keywords bloqueados (blacklist)
 */
export const BLOCKED_KEYWORDS = [
  // Data modification
  'DROP',
  'DELETE',
  'UPDATE',
  'INSERT',
  'TRUNCATE',

  // Schema modification
  'ALTER',
  'CREATE',
  'RENAME',

  // Permissions
  'GRANT',
  'REVOKE',

  // Execution
  'EXEC',
  'EXECUTE',
  'CALL',

  // System
  'SHUTDOWN',
  'BACKUP',
  'RESTORE',

  // Firebird specific
  'RECREATE',
  'CONNECT',
  'DISCONNECT',
];

/**
 * Funciones peligrosas
 */
const BLOCKED_FUNCTIONS = [
  'EXECUTE BLOCK',
  'EXECUTE STATEMENT',
  'EXECUTE PROCEDURE',
];

/**
 * Límites
 */
const MAX_SQL_LENGTH = 5000; // Máximo tamaño de query
const MAX_QUERY_ROWS = 10000; // Máximo de filas a retornar
const MAX_JOIN_COUNT = 5; // Máximo número de JOINs
const MAX_WHERE_CONDITIONS = 20; // Máximo condiciones en WHERE
const MAX_SUBQUERIES = 2; // Máximo número de subqueries

// ========================
// ERROR CLASSES
// ========================

export class SQLValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SQLValidationError';
  }
}

// ========================
// RESULTADO DE VALIDACIÓN
// ========================

export interface ValidationResult {
  isValid: boolean;
  validatedSQL: string;
  errors: string[];
  warnings: string[];
  metadata: {
    tables: string[];
    columns: string[];
    operations: string[];
    hasLimit: boolean;
    estimatedComplexity: 'low' | 'medium' | 'high';
  };
}

// ========================
// VALIDADOR PRINCIPAL
// ========================

/**
 * Validar y sanitizar SQL query
 */
export function validateSQL(sql: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validatedSQL = sql.trim();

  // 1. Validaciones básicas
  if (!validatedSQL) {
    throw new SQLValidationError('SQL query is empty', 'EMPTY_SQL');
  }

  if (validatedSQL.length > MAX_SQL_LENGTH) {
    throw new SQLValidationError(
      `SQL query exceeds maximum length of ${MAX_SQL_LENGTH} characters`,
      'SQL_TOO_LONG'
    );
  }

  // 2. Normalizar SQL (remover comentarios y whitespace excesivo)
  validatedSQL = normalizeSQL(validatedSQL);

  // 3. Verificar keywords bloqueados (quick check antes de parsing)
  checkBlockedKeywords(validatedSQL);

  // 4. Parse AST
  let ast: AST | AST[];
  try {
    const parser = new Parser();
    ast = parser.astify(validatedSQL, { database: 'Firebird' });
  } catch (error) {
    throw new SQLValidationError(
      `SQL syntax error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'SYNTAX_ERROR',
      { originalError: error }
    );
  }

  // Si retorna array, tomar el primer statement
  if (Array.isArray(ast)) {
    if (ast.length === 0) {
      throw new SQLValidationError('No SQL statements found', 'NO_STATEMENTS');
    }
    if (ast.length > 1) {
      throw new SQLValidationError(
        'Multiple SQL statements not allowed',
        'MULTIPLE_STATEMENTS'
      );
    }
    ast = ast[0];
  }

  // 5. Verificar que sea SELECT
  if (ast.type !== 'select') {
    throw new SQLValidationError(
      `Only SELECT queries are allowed, got: ${ast.type}`,
      'INVALID_OPERATION'
    );
  }

  // 6. Extraer metadata
  const tables = extractTables(ast);
  const columns = extractColumns(ast);
  const operations = [ast.type.toUpperCase()];

  // 7. Validar tablas permitidas
  const invalidTables = tables.filter(t => !ALLOWED_TABLES.includes(t.toUpperCase()));
  if (invalidTables.length > 0) {
    throw new SQLValidationError(
      `Access denied to tables: ${invalidTables.join(', ')}`,
      'INVALID_TABLES',
      { invalidTables }
    );
  }

  // 8. Validar complejidad de la query
  const complexity = validateQueryComplexity(ast, warnings);

  // 9. Verificar/añadir LIMIT
  const hasLimit = checkAndAddLimit(ast);
  if (!hasLimit) {
    warnings.push(`Added automatic FIRST ${MAX_QUERY_ROWS} limit`);
    validatedSQL = addFirstLimit(validatedSQL, MAX_QUERY_ROWS);
  }

  // 10. Validar funciones peligrosas
  checkDangerousFunctions(validatedSQL);

  // 11. Validar UNION/INTERSECT/EXCEPT
  checkSetOperations(ast);

  return {
    isValid: errors.length === 0,
    validatedSQL,
    errors,
    warnings,
    metadata: {
      tables,
      columns,
      operations,
      hasLimit,
      estimatedComplexity: complexity,
    },
  };
}

// ========================
// FUNCIONES AUXILIARES
// ========================

/**
 * Normalizar SQL (remover comentarios, whitespace excesivo)
 */
function normalizeSQL(sql: string): string {
  // Remover comentarios de línea
  let normalized = sql.replace(/--[^\n]*/g, '');

  // Remover comentarios de bloque
  normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');

  // Normalizar whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Verificar keywords bloqueados
 */
function checkBlockedKeywords(sql: string): void {
  const upperSQL = sql.toUpperCase();

  for (const keyword of BLOCKED_KEYWORDS) {
    // Verificar que sea palabra completa (no parte de otra palabra)
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(upperSQL)) {
      throw new SQLValidationError(
        `Blocked keyword detected: ${keyword}`,
        'BLOCKED_KEYWORD',
        { keyword }
      );
    }
  }
}

/**
 * Verificar funciones peligrosas
 */
function checkDangerousFunctions(sql: string): void {
  const upperSQL = sql.toUpperCase();

  for (const func of BLOCKED_FUNCTIONS) {
    if (upperSQL.includes(func)) {
      throw new SQLValidationError(
        `Dangerous function detected: ${func}`,
        'DANGEROUS_FUNCTION',
        { function: func }
      );
    }
  }
}

/**
 * Extraer tablas del AST
 */
function extractTables(ast: any): string[] {
  const tables: string[] = [];

  function traverse(node: any) {
    if (!node) return;

    // Tabla principal
    if (node.from && Array.isArray(node.from)) {
      for (const from of node.from) {
        if (from.table) {
          tables.push(from.table);
        }
        // Subquery en FROM
        if (from.expr) {
          traverse(from.expr);
        }
      }
    }

    // JOINs
    if (node.from) {
      for (const from of node.from) {
        if (from.join) {
          traverse({ from: [from.join] });
        }
      }
    }

    // Subqueries
    if (node.where) {
      traverseExpression(node.where);
    }
  }

  function traverseExpression(expr: any) {
    if (!expr) return;

    if (expr.type === 'select') {
      traverse(expr);
    }

    if (expr.left) traverseExpression(expr.left);
    if (expr.right) traverseExpression(expr.right);
  }

  traverse(ast);

  return [...new Set(tables)]; // Remove duplicates
}

/**
 * Extraer columnas del AST
 */
function extractColumns(ast: any): string[] {
  const columns: string[] = [];

  if (ast.columns && Array.isArray(ast.columns)) {
    for (const col of ast.columns) {
      if (col.expr && col.expr.column) {
        columns.push(col.expr.column);
      } else if (col.expr && col.expr.type === 'aggr_func') {
        // Función agregada
        columns.push(`${col.expr.name}(${col.expr.args?.expr?.column || '*'})`);
      }
    }
  }

  return columns;
}

/**
 * Validar complejidad de la query
 */
function validateQueryComplexity(ast: any, warnings: string[]): 'low' | 'medium' | 'high' {
  let complexity = 0;

  // Contar JOINs
  const joinCount = countJoins(ast);
  if (joinCount > MAX_JOIN_COUNT) {
    throw new SQLValidationError(
      `Too many JOINs (${joinCount}), maximum allowed: ${MAX_JOIN_COUNT}`,
      'TOO_COMPLEX'
    );
  }
  complexity += joinCount * 2;

  // Contar condiciones WHERE
  const whereCount = countWhereConditions(ast);
  if (whereCount > MAX_WHERE_CONDITIONS) {
    throw new SQLValidationError(
      `Too many WHERE conditions (${whereCount}), maximum allowed: ${MAX_WHERE_CONDITIONS}`,
      'TOO_COMPLEX'
    );
  }
  complexity += whereCount;

  // Contar subqueries
  const subqueryCount = countSubqueries(ast);
  if (subqueryCount > MAX_SUBQUERIES) {
    throw new SQLValidationError(
      `Too many subqueries (${subqueryCount}), maximum allowed: ${MAX_SUBQUERIES}`,
      'TOO_COMPLEX'
    );
  }
  complexity += subqueryCount * 3;

  // Determinar nivel de complejidad
  if (complexity === 0) return 'low';
  if (complexity <= 5) return 'low';
  if (complexity <= 15) {
    warnings.push('Query has medium complexity, may take longer to execute');
    return 'medium';
  }

  warnings.push('Query has high complexity, execution time may be significant');
  return 'high';
}

/**
 * Contar JOINs
 */
function countJoins(ast: any): number {
  let count = 0;

  if (ast.from && Array.isArray(ast.from)) {
    for (const from of ast.from) {
      if (from.join) {
        count++;
        // Recursivo para JOINs anidados
        count += countJoins({ from: [from.join] });
      }
    }
  }

  return count;
}

/**
 * Contar condiciones WHERE
 */
function countWhereConditions(ast: any): number {
  if (!ast.where) return 0;

  function countConditions(expr: any): number {
    if (!expr) return 0;

    if (expr.type === 'binary_expr') {
      if (expr.operator === 'AND' || expr.operator === 'OR') {
        return countConditions(expr.left) + countConditions(expr.right);
      }
      return 1;
    }

    return 0;
  }

  return countConditions(ast.where);
}

/**
 * Contar subqueries
 */
function countSubqueries(ast: any): number {
  let count = 0;

  function traverse(node: any) {
    if (!node) return;

    if (node.type === 'select') {
      count++;
    }

    // Traversar todas las propiedades
    for (const key in node) {
      const value = node[key];
      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach(item => traverse(item));
        } else {
          traverse(value);
        }
      }
    }
  }

  // Empezar desde el AST pero no contar el SELECT principal
  if (ast.from) traverse(ast.from);
  if (ast.where) traverse(ast.where);
  if (ast.columns) traverse(ast.columns);

  return count;
}

/**
 * Verificar si tiene LIMIT/FIRST
 */
function checkAndAddLimit(ast: any): boolean {
  // Firebird usa _limit con value
  if (ast._limit && ast._limit.value && Array.isArray(ast._limit.value)) {
    const limitValue = ast._limit.value[0];
    if (limitValue && typeof limitValue.value === 'number') {
      return true;
    }
  }

  return false;
}

/**
 * Añadir FIRST limit a SQL string
 */
function addFirstLimit(sql: string, limit: number): string {
  // Firebird syntax: SELECT FIRST N ...
  return sql.replace(/^SELECT/i, `SELECT FIRST ${limit}`);
}

/**
 * Validar operaciones SET (UNION, INTERSECT, EXCEPT)
 */
function checkSetOperations(ast: any): void {
  // Por ahora permitimos UNION, pero con límites
  if (ast.union) {
    // Máximo 2 UNIONs
    let unionCount = 0;
    let current = ast;
    while (current.union) {
      unionCount++;
      current = current.union;
    }

    if (unionCount > 2) {
      throw new SQLValidationError(
        `Too many UNION operations (${unionCount}), maximum allowed: 2`,
        'TOO_MANY_UNIONS'
      );
    }
  }

  // INTERSECT y EXCEPT no son comúnmente usados, pero los validamos
  if (ast.intersect || ast.except) {
    throw new SQLValidationError(
      'INTERSECT and EXCEPT operations are not supported',
      'UNSUPPORTED_OPERATION'
    );
  }
}

// ========================
// UTILIDADES
// ========================

/**
 * Verificar si un SQL es seguro (validación rápida sin AST)
 */
export function isQuickSafe(sql: string): boolean {
  const upperSQL = sql.toUpperCase().trim();

  // Must start with SELECT
  if (!upperSQL.startsWith('SELECT')) {
    return false;
  }

  // No blocked keywords
  for (const keyword of BLOCKED_KEYWORDS) {
    if (upperSQL.includes(keyword)) {
      return false;
    }
  }

  // No dangerous functions
  for (const func of BLOCKED_FUNCTIONS) {
    if (upperSQL.includes(func)) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitizar SQL (remover caracteres peligrosos)
 */
export function sanitizeSQL(sql: string): string {
  // Remover caracteres potencialmente peligrosos
  let sanitized = sql
    .replace(/;\s*$/g, '') // Remover ; al final
    .replace(/\\x[0-9a-fA-F]{2}/g, '') // Remover hex codes
    .replace(/\\[0-7]{3}/g, '') // Remover octal codes
    .trim();

  return sanitized;
}

/**
 * Extraer información de la query
 */
export interface QueryInfo {
  tables: string[];
  columns: string[];
  hasAggregates: boolean;
  hasGroupBy: boolean;
  hasOrderBy: boolean;
  hasLimit: boolean;
  joinCount: number;
}

export function getQueryInfo(sql: string): QueryInfo {
  try {
    const parser = new Parser();
    const ast = parser.astify(sql, { database: 'Firebird' });
    const astObj = Array.isArray(ast) ? ast[0] : ast;

    return {
      tables: extractTables(astObj),
      columns: extractColumns(astObj),
      hasAggregates: checkHasAggregates(astObj),
      hasGroupBy: !!astObj.groupby,
      hasOrderBy: !!astObj.orderby,
      hasLimit: checkAndAddLimit(astObj),
      joinCount: countJoins(astObj),
    };
  } catch (error) {
    throw new SQLValidationError(
      'Failed to parse SQL',
      'PARSE_ERROR',
      { originalError: error }
    );
  }
}

/**
 * Verificar si tiene funciones agregadas
 */
function checkHasAggregates(ast: any): boolean {
  if (!ast.columns) return false;

  for (const col of ast.columns) {
    if (col.expr && col.expr.type === 'aggr_func') {
      return true;
    }
  }

  return false;
}
