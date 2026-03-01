// =========================================================
// CONTROLLER: Admin — login, orders list, shipping updates
// =========================================================

const authService = require('../services/auth/authService');
const orderService = require('../services/orders/orderService');
const emailService = require('../services/email/emailService');
const { logger, incrementErrorCount } = require('../utils/logger');
const { getStatusDescription } = require('../utils/helpers');
const { recordFailedAttempt, resetAttempts } = require('../middleware/bruteForce');

async function login(req, res) {
    try {
        const { password } = req.body;
        logger.info('ADMIN_LOGIN_ATTEMPT', { ip: req.ip });

        const token = await authService.validateAdmin(password);
        if (!token) {
            recordFailedAttempt(req.ip);
            logger.warn('ADMIN_LOGIN_FAILED', { ip: req.ip });
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        resetAttempts(req.ip);
        logger.info('ADMIN_LOGIN_SUCCESS', { ip: req.ip });
        return res.json({ success: true, token });

    } catch (err) {
        logger.error('ADMIN_LOGIN_ERROR', { ip: req.ip, error: err.message });
        incrementErrorCount();
        return res.status(500).json({
            error: err.message === 'Server misconfigured: missing ADMIN_PASS_HASH or JWT_SECRET'
                ? 'Server misconfigured' : 'Login error'
        });
    }
}

async function getOrders(req, res) {
    try {
        const orders = await orderService.getAdminOrders();
        res.json(orders);
    } catch (e) {
        res.status(500).json({ error: 'Error loading orders' });
    }
}

async function updateShipping(req, res) {
    const { orderId, status, trackingNumber, carrier, description } = req.body;

    const order = await orderService.updateShippingStatus(orderId, status, trackingNumber, carrier, description);
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

    await emailService.sendShippingUpdateEmail(order.email, orderId, status, getStatusDescription(status), trackingNumber);

    res.json({ success: true });
}

module.exports = { login, getOrders, updateShipping };
