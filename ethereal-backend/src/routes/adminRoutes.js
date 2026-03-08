// =========================================================
// ROUTES: Admin — login, orders, shipping updates
// =========================================================

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authAdmin');
const { adminLimiter } = require('../middleware/rateLimiters');
const { validate } = require('../validation/validate');
const { adminLoginSchema, shippingUpdateSchema } = require('../validation/schemas');

router.post('/api/admin/login', adminLimiter, validate(adminLoginSchema), adminController.login);
router.get('/api/admin/orders', verifyToken, adminController.getOrders);
router.post('/api/admin/update-shipping', verifyToken, validate(shippingUpdateSchema), adminController.updateShipping);

module.exports = router;
