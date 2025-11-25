module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,

  firebird: {
    host: process.env.FIREBIRD_HOST || '192.65.134.78',
    port: parseInt(process.env.FIREBIRD_PORT, 10) || 3050,
    database: process.env.FIREBIRD_DATABASE || 'C:\\Microsip datos\\EMBLER.FDB',
    user: process.env.FIREBIRD_USER || 'ODBC',
    password: process.env.FIREBIRD_PASSWORD || 'OD12345',
    lowercase_keys: false,
    pageSize: 4096
  },

  apiKey: process.env.API_KEY || 'change_me_in_production',

  cors: {
    origins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',')
  },

  cache: {
    ttl: parseInt(process.env.CACHE_TTL, 10) || 1800 // 30 minutos
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
