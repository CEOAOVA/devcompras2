const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');

// Middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Routes
const healthRoutes = require('./routes/health');
const productosRoutes = require('./routes/productos');
const clientesRoutes = require('./routes/clientes');
const inventarioRoutes = require('./routes/inventario');
const ventasRoutes = require('./routes/ventas');
const queryRoutes = require('./routes/query');

const app = express();

// Security & Parsing
app.use(helmet());
app.use(cors({
  origin: config.cors.origins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check (sin autenticación)
app.use('/health', healthRoutes);

// API routes (con autenticación)
app.use('/api/productos', authMiddleware, productosRoutes);
app.use('/api/clientes', authMiddleware, clientesRoutes);
app.use('/api/inventario', authMiddleware, inventarioRoutes);
app.use('/api/ventas', authMiddleware, ventasRoutes);
app.use('/api/query', authMiddleware, queryRoutes); // Generic query endpoint for LLM Analytics

// Error handler
app.use(errorHandler);

module.exports = app;
