require('dotenv').config();
const server = require('./server');
const config = require('./config');

const PORT = config.port;

server.listen(PORT, () => {
  console.log('=================================');
  console.log(`🚀 Firebird Connector running`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Firebird: ${config.firebird.host}:${config.firebird.port}`);
  console.log('=================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
