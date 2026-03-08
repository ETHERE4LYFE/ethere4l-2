// =========================================================
// ROUTES: Admin RBAC — Product Management, Orders, Analytics
// =========================================================
// All routes require verifyCustomerSession + requireAdmin.
// =========================================================

const express = require('express');
const router = express.Router();
const adminRbacController = require('../controllers/adminRbacController');
const { verifyCustomerSession } = require('../middleware/authCustomer');
const { requireAdmin } = require('../middleware/requireAdmin');

// Apply auth + admin check to all routes
router.use('/api/admin/rbac', verifyCustomerSession, requireAdmin);

// Product Management
router.get('/api/admin/rbac/products', adminRbacController.listProducts);
router.post('/api/admin/rbac/products', adminRbacController.createProduct);
router.patch('/api/admin/rbac/products/:id', adminRbacController.updateProduct);
router.delete('/api/admin/rbac/products/:id', adminRbacController.deleteProduct);

// Order Management
router.get('/api/admin/rbac/orders', adminRbacController.listOrders);

// Analytics
router.get('/api/admin/rbac/analytics/overview', adminRbacController.analyticsOverview);

module.exports = router;
