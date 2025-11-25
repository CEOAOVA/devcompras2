const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');

// GET /api/productos - Listar todos
router.get('/', productosController.listar);

// GET /api/productos/:codigo - Obtener uno
router.get('/:codigo', productosController.obtener);

module.exports = router;
