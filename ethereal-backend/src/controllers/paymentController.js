// =========================================================
// CONTROLLER: Payment — Checkout session creation
// =========================================================

const stripeService = require('../services/payments/stripeService');
const orderService = require('../services/orders/orderService');
const inventoryService = require('../services/inventory/inventoryService');
const { stripeCheckoutFailuresTotal } = require('../utils/metrics');
const { isCheckoutAbusive } = require('../middleware/adaptiveAbuse');
const { dbPersistent, PRODUCTS_DB } = require('../database');
const { logger, incrementErrorCount } = require('../utils/logger');
const { parseSafeNumber, validateEmail } = require('../utils/helpers');

async function createCheckoutSession(req, res) {
    // 7. STRIPE PROTECTION: Abuse check MUST occur BEFORE Stripe API call.
    if (await isCheckoutAbusive(req)) {
        return res.status(403).json({ error: "Access denied. Action quarantined due to abuse pattern." });
    }

    try {
        const { items, customer } = req.validatedBody;

        // 4. BELT-AND-SUSPENDERS DEFENSE
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: "Invalid items format" });
        }

        const customerEmail = customer?.email ? String(customer.email).trim().toLowerCase() : '';
        if (!validateEmail(customerEmail)) {
            return res.status(400).json({ error: 'Email inválido. Verifica tu dirección de correo.' });
        }

        for (const item of items) {
            const cantidad = parseSafeNumber(item.cantidad, 0);
            if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10) {
                return res.status(400).json({
                    error: `Cantidad inválida para producto ${item.id || 'desconocido'}: ${item.cantidad}. Debe ser entre 1 y 10.`
                });
            }
        }

        // Stock check
        if (dbPersistent && PRODUCTS_DB.length > 0) {
            const stockResult = await inventoryService.checkStock(items);
            if (!stockResult.ok) {
                logger.warn('STOCK_INSUFICIENTE', {
                    productId: stockResult.productId,
                    requested: stockResult.requested,
                    available: stockResult.available
                });
                return res.status(400).json({
                    error: `Stock insuficiente para "${stockResult.productName}". Disponible: ${stockResult.available}`
                });
            }
        }

        const tempOrderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

        // Build line items + calculate shipping
        const { lineItems, pesoTotal, serverSubtotal } = stripeService.buildLineItems(items);
        const costoEnvio = stripeService.calculateShipping(items, pesoTotal);
        const pedidoSnapshot = stripeService.buildOrderSnapshot(items, serverSubtotal, costoEnvio);

        // Load test bypass (No actual Stripe hit)
        if (req.headers['x-load-test'] === 'true' && process.env.NODE_ENV === 'test') {
            logger.info('LOAD_TEST_GATE', { action: 'bypass_stripe', orderId: tempOrderId });
            // Simulate the internal TX DB work but skip the real Stripe outbound network request
            if (dbPersistent) {
                await orderService.createOrder(tempOrderId, customerEmail, items, customer, pedidoSnapshot, costoEnvio);
            }
            return res.json({ url: `${process.env.FRONTEND_URL}/success.html?mock_load_test=1` });
        }

        // Create order in DB (Serializable TX)
        if (dbPersistent) {
            try {
                await orderService.createOrder(tempOrderId, customerEmail, items, customer, pedidoSnapshot, costoEnvio);
            } catch (txError) {
                if (txError.message.startsWith('STOCK_INSUFICIENTE')) {
                    const parts = txError.message.split(':');
                    return res.status(400).json({
                        error: `Stock insuficiente para producto ${parts[1]}. Disponible: ${parts[2]}`
                    });
                }
                logger.error('TRANSACTION_ERROR', { error: txError.message });
                // We increment this generic failure as well
                stripeCheckoutFailuresTotal.inc();
                return res.status(500).json({ error: 'Error procesando pedido' });
            }
        }

        // Create actual Stripe session
        const session = await stripeService.createCheckoutSession(tempOrderId, customerEmail, lineItems, costoEnvio);
        res.json({ url: session.url });

    } catch (e) {
        logger.error('STRIPE_CHECKOUT_ERROR', { error: e.message, stack: e.stack });
        incrementErrorCount();
        stripeCheckoutFailuresTotal.inc();
        res.status(500).json({ error: "Error creando sesión de pago: " + e.message });
    }
}

function crearPedidoLegacy(req, res) {
    res.json({ success: true, message: "Use /api/create-checkout-session for payments" });
}

module.exports = { createCheckoutSession, crearPedidoLegacy };
