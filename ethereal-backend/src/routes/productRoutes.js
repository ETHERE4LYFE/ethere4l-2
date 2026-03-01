// =========================================================
// ROUTES: Products — catalog and products
// =========================================================

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/api/catalogo', productController.getCatalog);
router.get('/api/productos', productController.getProducts);

module.exports = router;
