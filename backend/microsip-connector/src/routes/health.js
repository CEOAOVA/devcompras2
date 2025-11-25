const express = require('express');
const router = express.Router();
const firebird = require('../firebird');

router.get('/', async (req, res) => {
  try {
    const connected = await firebird.testConnectionAsync();

    res.json({
      status: 'ok',
      firebird: connected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      firebird: 'disconnected',
      error: error.message
    });
  }
});

module.exports = router;
