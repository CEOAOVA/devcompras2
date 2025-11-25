const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');

router.get('/', clientesController.listar);
router.get('/:id', clientesController.obtener);

module.exports = router;
