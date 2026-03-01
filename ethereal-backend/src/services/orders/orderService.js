// =========================================================
// SERVICE: Orders — Creation, status updates, queries
// =========================================================
// No Express req/res. Pure business logic.
// =========================================================

const prisma = require('../../database/prismaClient');
const { logger, incrementErrorCount } = require('../../utils/logger');
const { parseSafeNumber, generateOrderToken, getStatusDescription } = require('../../utils/helpers');
const { confirmStock, reserveStock } = require('../inventory/inventoryService');
const emailService = require('../email/emailService');

async function createOrder(orderId, email, items, customer, pedidoSnapshot, costoEnvio) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Reserve Stock transactionally
            await reserveStock(items, tx);

            // 2. Create Order
            await tx.order.create({
                data: {
                    id: orderId,
                    email: email.toLowerCase(),
                    status: 'PENDIENTE',
                    shippingCost: costoEnvio,
                    data: JSON.stringify({
                        cliente: { ...customer, email },
                        pedido: pedidoSnapshot
                    }),
                    user: {
                        connectOrCreate: {
                            where: { email: email.toLowerCase() },
                            create: { email: email.toLowerCase(), nombre: customer.nombre, telefono: customer.telefono }
                        }
                    }
                }
            });

            // 3. Create OrderItems
            const orderItemsData = items.map(item => ({
                orderId: orderId,
                productId: String(item.id),
                cantidad: parseSafeNumber(item.cantidad, 1),
                precio: parseSafeNumber(item.precio, 0)
            }));

            await tx.orderItem.createMany({
                data: orderItemsData
            });
        }, {
            isolationLevel: 'Serializable'
        });

        logger.info('PEDIDO_CREADO', { orderId, items: items.length });
    } catch (e) {
        logger.error('ERROR_CREATING_ORDER', { error: e.message, stack: e.stack });
        throw e;
    }
}

async function getOrderById(orderId) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            id: true,
            email: true,
            status: true,
            shippingStatus: true,
            trackingNumber: true,
            carrierCode: true,
            shippingCost: true,
            data: true,
            createdAt: true,
            shippingHistory: true
        }
    });

    if (order) {
        // match snake_case for frontend
        return {
            ...order,
            created_at: order.createdAt.toISOString(),
            shipping_status: order.shippingStatus,
            tracking_number: order.trackingNumber,
            carrier_code: order.carrierCode,
            shipping_cost: order.shippingCost,
            shipping_history: order.shippingHistory
        };
    }
    return null;
}

async function getOrdersByEmail(email) {
    const orders = await prisma.order.findMany({
        where: { email: { equals: email, mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, createdAt: true, data: true }
    });

    return orders.map(o => ({
        ...o,
        created_at: o.createdAt.toISOString()
    }));
}

async function getOrdersByEmailLegacy(email) {
    // Same as above but with tracking_number
    const orders = await prisma.order.findMany({
        where: { email: email },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, createdAt: true, data: true, trackingNumber: true }
    });

    return orders.map(o => ({
        ...o,
        created_at: o.createdAt.toISOString(),
        tracking_number: o.trackingNumber
    }));
}

async function getAdminOrders() {
    const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    return orders.map(o => ({
        ...o,
        data: o.data ? JSON.parse(o.data) : null,
        created_at: o.createdAt.toISOString(),
        shipping_status: o.shippingStatus,
        shipping_cost: o.shippingCost,
        tracking_number: o.trackingNumber
    }));
}

async function updateShippingStatus(orderId, status, trackingNumber, carrier, description) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return null;

    let history = [];
    try {
        history = order.shippingHistory ? JSON.parse(order.shippingHistory) : [];
    } catch (e) { history = []; }

    history.unshift({
        status,
        description: description || getStatusDescription(status),
        timestamp: new Date().toISOString(),
        location: ''
    });

    const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
            shippingStatus: status,
            shippingHistory: JSON.stringify(history),
            trackingNumber: trackingNumber || undefined,
            carrierCode: carrier || undefined
        }
    });

    return updated;
}

async function confirmPayment(session) {
    const orderId = session.metadata?.order_id;
    if (!orderId) {
        logger.error('WEBHOOK_NO_ORDER_ID', { sessionId: session.id });
        return;
    }

    try {
        const existingOrder = await prisma.order.findUnique({
            where: { id: orderId },
            select: { status: true, data: true }
        });

        if (!existingOrder) {
            logger.error('WEBHOOK_ORDER_NOT_FOUND', { orderId });
            return;
        }

        if (existingOrder.status === 'PAGADO') {
            logger.warn('WEBHOOK_IDEMPOTENCY', {
                orderId,
                message: 'Pedido ya estaba PAGADO. Webhook duplicado ignorado.'
            });
            return;
        }

        await prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: orderId },
                data: {
                    status: 'PAGADO',
                    paymentRef: session.payment_intent,
                    paidAt: new Date()
                }
            });

            let parsed;
            try {
                parsed = JSON.parse(existingOrder.data);
            } catch {
                parsed = { pedido: { items: [] } };
            }

            const orderItems = parsed.pedido?.items || [];
            await confirmStock(orderItems, tx);
        }, {
            isolationLevel: 'Serializable'
        });

        logger.info('PAYMENT_CONFIRMED_DB', { orderId, paymentIntent: session.payment_intent });

        const row = await prisma.order.findUnique({
            where: { id: orderId },
            select: { data: true }
        });

        if (!row) return;

        const parsed = JSON.parse(row.data);
        const cliente = parsed.cliente;
        const pedido = parsed.pedido;

        logger.info('PAGO_CONFIRMADO', { orderId, total: pedido.total, email: cliente.email });

        try {
            await emailService.sendOrderConfirmationEmails(orderId, cliente, pedido);
            logger.info('WEBHOOK_EMAILS_COMPLETED', { orderId });
        } catch (e) {
            logger.error('WEBHOOK_EMAIL_ERROR', { orderId, error: e.message });
        }

    } catch (e) {
        logger.error('WEBHOOK_PROCESSING_ERROR', { orderId, error: e.message, stack: e.stack });
        incrementErrorCount();
    }
}

module.exports = {
    createOrder,
    getOrderById,
    getOrdersByEmail,
    getOrdersByEmailLegacy,
    getAdminOrders,
    updateShippingStatus,
    confirmPayment
};
