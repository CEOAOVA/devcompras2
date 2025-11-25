const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');

// GET /api/ventas - Listar ventas
router.get('/', ventasController.listar);

// GET /api/ventas/kpis - Obtener KPIs del dashboard
router.get('/kpis', ventasController.obtenerKPIs);

// GET /api/ventas/por-sucursal - Ventas agrupadas por sucursal
router.get('/por-sucursal', ventasController.ventasPorSucursal);

// GET /api/ventas/productos-top - Top productos más vendidos
router.get('/productos-top', ventasController.productosTop);

// GET /api/ventas/tendencias - Tendencias de ventas (día/semana/mes)
router.get('/tendencias', ventasController.tendencias);

module.exports = router;
