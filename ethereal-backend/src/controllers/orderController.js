// =========================================================
// CONTROLLER: Order — tracking, customer orders, my-orders
// =========================================================

const orderService = require('../services/orders/orderService');
const authService = require('../services/auth/authService');
const { dbPersistent } = require('../database');
const { generateOrderToken } = require('../utils/helpers');

async function trackOrder(req, res) {
    const { orderId } = req.params;

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authorization requerido' });

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
        decoded = authService.verifyOrderToken(token);
    } catch {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    if (!dbPersistent) return res.status(503).json({ error: 'DB no disponible' });

    const orderRow = await orderService.getOrderById(orderId);
    if (!orderRow) return res.status(404).json({ error: 'Orden no encontrada' });

    const isOwner = decoded.o === orderId;
    const isUser = decoded.email === orderRow.email;
    const isAdmin = decoded.role === 'admin';

    if (!isOwner && !isUser && !isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    let parsedData = {};
    try { parsedData = JSON.parse(orderRow.data); }
    catch { parsedData = { pedido: { items: [], total: 0 } }; }

    res.json({
        id: orderRow.id,
        status: orderRow.shipping_status || 'CONFIRMADO',
        payment_status: orderRow.status,
        date: orderRow.created_at,
        tracking_number: orderRow.tracking_number,
        carrier: orderRow.carrier_code,
        shipping_cost: orderRow.shipping_cost || 0,
        total: parsedData.pedido.total || 0,
        items: parsedData.pedido.items || [],
        tracking_history: orderRow.shipping_history ? JSON.parse(orderRow.shipping_history) : []
    });
}

async function getCustomerOrders(req, res) {
    try {
        const email = req.customer.email.toLowerCase();
        const rows = await orderService.getOrdersByEmail(email);

        const orders = rows.map(o => {
            let parsed;
            try { parsed = JSON.parse(o.data); }
            catch { parsed = { pedido: { total: 0, envio: 0, items: [] } }; }

            const pedido = parsed.pedido || {};
            return {
                id: o.id,
                status: o.status,
                created_at: o.created_at,
                total: pedido.total || 0,
                shipping: pedido.envio || 0,
                items: pedido.items || [],
                order_token: generateOrderToken(o.id, email)
            };
        });

        res.json({ email, orders });

    } catch (err) {
        console.error('CUSTOMER_ORDERS_ERROR', err);
        res.status(500).json({ email: '', orders: [] });
    }
}

async function getMyOrders(req, res) {
    const auth = req.headers.authorization;
    if (!auth) return res.sendStatus(401);

    const token = auth.split(' ')[1];

    try {
        const decoded = authService.verifyOrderToken(token);
        if (decoded.scope !== 'read_orders') return res.sendStatus(403);

        const orders = await orderService.getOrdersByEmailLegacy(decoded.email);

        const response = orders.map(row => {
            let parsed;
            try { parsed = JSON.parse(row.data); }
            catch { parsed = { pedido: { total: 0, items: [] } }; }

            return {
                id: row.id,
                status: row.status,
                date: row.created_at,
                total: parsed.pedido.total,
                item_count: parsed.pedido.items.length,
                tracking_number: row.tracking_number,
                access_token: generateOrderToken(row.id, decoded.email)
            };
        });

        res.json({ orders: response });

    } catch (err) {
        console.error('My orders error:', err);
        res.sendStatus(403);
    }
}

module.exports = { trackOrder, getCustomerOrders, getMyOrders };
