// =========================================================
// ROUTES: Payment — checkout session
// =========================================================

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { checkoutLimiter } = require('../middleware/rateLimiters');
const { validate } = require('../validation/validate');
const { checkoutSessionSchema } = require('../validation/schemas');

router.post('/api/create-checkout-session', checkoutLimiter, validate(checkoutSessionSchema), paymentController.createCheckoutSession);
router.post('/api/crear-pedido', paymentController.crearPedidoLegacy);

module.exports = router;
