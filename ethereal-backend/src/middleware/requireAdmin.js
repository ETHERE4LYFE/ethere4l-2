// =========================================================
// MIDDLEWARE: Require ADMIN role (RBAC)
// =========================================================
// Must be used AFTER verifyCustomerSession.
// Checks req.customer.role === 'ADMIN'.
// =========================================================

const { logger } = require('../utils/logger');

function requireAdmin(req, res, next) {
    if (!req.customer || req.customer.role !== 'ADMIN') {
        logger.warn('ADMIN_ACCESS_DENIED', {
            email: req.customer?.email || 'unknown',
            role: req.customer?.role || 'none',
            path: req.originalUrl
        });
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = { requireAdmin };
