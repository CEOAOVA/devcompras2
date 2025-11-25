const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');

router.get('/', inventarioController.listar);
router.get('/:codigo', inventarioController.obtener);

module.exports = router;
