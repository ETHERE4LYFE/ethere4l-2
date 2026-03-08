// =========================================================
// ROUTES: Orders — tracking, customer orders, my-orders
// =========================================================

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { trackingLimiter } = require('../middleware/rateLimiters');
const { verifyCustomerSession } = require('../middleware/authCustomer');

// Authenticated order endpoints (HttpOnly cookie session)
router.get('/api/orders', verifyCustomerSession, orderController.getAuthenticatedOrders);

// Specific path routes MUST be before dynamic :orderId param
router.get('/api/orders/track/:orderId', trackingLimiter, orderController.trackOrder);
router.get('/api/orders/:orderId', verifyCustomerSession, orderController.getAuthenticatedOrderById);

// Legacy endpoints
router.get('/api/customer/orders', verifyCustomerSession, orderController.getCustomerOrders);
router.get('/api/my-orders', orderController.getMyOrders);

module.exports = router;
