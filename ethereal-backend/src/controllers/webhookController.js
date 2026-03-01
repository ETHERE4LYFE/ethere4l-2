// =========================================================
// CONTROLLER: Webhook — Stripe webhook event handler
// =========================================================

const stripeService = require('../services/payments/stripeService');
const orderService = require('../services/orders/orderService');
const { logger } = require('../utils/logger');

async function handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripeService.verifyWebhookSignature(req.body, sig);
    } catch (err) {
        logger.error('WEBHOOK_SIGNATURE_FAIL', { error: err.message });
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Replay protection check
    if (req.checkReplay && req.checkReplay(event.id)) {
        logger.warn('WEBHOOK_REPLAY_REJECTED', { eventId: event.id });
        return res.json({ received: true, replay: true });
    }

    logger.info('WEBHOOK_RECEIVED', { type: event.type, eventId: event.id });

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        try {
            await orderService.confirmPayment(session);
            logger.info('WEBHOOK_PROCESSED', { orderId: session.metadata?.order_id });
        } catch (e) {
            logger.error('WEBHOOK_HANDLER_ERROR', { error: e.message, stack: e.stack });
        }
    }

    res.json({ received: true });
}

module.exports = { handleWebhook };
