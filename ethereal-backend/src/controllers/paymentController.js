// =========================================================
// CONTROLLER: Payment — Checkout session creation
// =========================================================

const stripeService = require('../services/payments/stripeService');
const orderService = require('../services/orders/orderService');
const inventoryService = require('../services/inventory/inventoryService');
const { dbPersistent, PRODUCTS_DB } = require('../database');
const { logger, incrementErrorCount } = require('../utils/logger');
const { parseSafeNumber, validateEmail } = require('../utils/helpers');

async function createCheckoutSession(req, res) {
    try {
        const { items, customer } = req.body;

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

        // Create order in DB
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
                return res.status(500).json({ error: 'Error procesando pedido' });
            }
        }

        // Create Stripe session
        const session = await stripeService.createCheckoutSession(tempOrderId, customerEmail, lineItems, costoEnvio);
        res.json({ url: session.url });

    } catch (e) {
        logger.error('STRIPE_CHECKOUT_ERROR', { error: e.message, stack: e.stack });
        incrementErrorCount();
        res.status(500).json({ error: "Error creando sesión de pago: " + e.message });
    }
}

function crearPedidoLegacy(req, res) {
    res.json({ success: true, message: "Use /api/create-checkout-session for payments" });
}

module.exports = { createCheckoutSession, crearPedidoLegacy };
