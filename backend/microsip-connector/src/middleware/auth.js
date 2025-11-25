const config = require('../config');

module.exports = function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'API Key requerida',
      message: 'Incluir header X-API-Key'
    });
  }

  if (apiKey !== config.apiKey) {
    return res.status(403).json({
      error: 'API Key inválida',
      message: 'Credenciales incorrectas'
    });
  }

  next();
};
