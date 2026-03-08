// =========================================================
// CONTROLLER: Admin RBAC — Products, Orders, Analytics
// =========================================================
// All endpoints require verifyCustomerSession + requireAdmin.
// =========================================================

const prisma = require('../database/prismaClient');
const { logger } = require('../utils/logger');

// ---------------------------------------------------------
// PRODUCT MANAGEMENT
// ---------------------------------------------------------

async function listProducts(req, res) {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, nombre: true, precio: true, talla: true,
                imagen: true, stock: true, descripcion: true,
                createdAt: true, updatedAt: true
            }
        });
        res.json({ products });
    } catch (e) {
        logger.error('ADMIN_LIST_PRODUCTS_ERROR', { error: e.message });
        res.status(500).json({ error: 'Error listing products' });
    }
}

async function createProduct(req, res) {
    try {
        const { id, nombre, precio, talla, imagen, stock, descripcion } = req.body;

        if (!id || !nombre || precio == null) {
            return res.status(400).json({ error: 'id, nombre, and precio are required' });
        }

        const product = await prisma.product.create({
            data: {
                id: String(id),
                nombre: String(nombre),
                precio: Number(precio),
                talla: talla ? String(talla) : null,
                imagen: imagen ? String(imagen) : null,
                stock: stock != null ? Number(stock) : 0,
                descripcion: descripcion ? String(descripcion) : null
            }
        });

        logger.info('ADMIN_PRODUCT_CREATED', {
            adminId: req.customer.userId,
            resourceId: product.id,
            timestamp: new Date().toISOString()
        });

        res.status(201).json(product);
    } catch (e) {
        if (e.code === 'P2002') {
            return res.status(409).json({ error: 'Product ID already exists' });
        }
        logger.error('ADMIN_CREATE_PRODUCT_ERROR', { error: e.message });
        res.status(500).json({ error: 'Error creating product' });
    }
}

async function updateProduct(req, res) {
    try {
        const { id } = req.params;
        const { nombre, precio, talla, imagen, stock, descripcion } = req.body;

        const data = {};
        if (nombre !== undefined) data.nombre = String(nombre);
        if (precio !== undefined) data.precio = Number(precio);
        if (talla !== undefined) data.talla = talla ? String(talla) : null;
        if (imagen !== undefined) data.imagen = imagen ? String(imagen) : null;
        if (stock !== undefined) data.stock = Number(stock);
        if (descripcion !== undefined) data.descripcion = descripcion ? String(descripcion) : null;

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const product = await prisma.product.update({
            where: { id },
            data
        });

        logger.info('ADMIN_PRODUCT_UPDATED', {
            adminId: req.customer.userId,
            resourceId: id,
            fields: Object.keys(data),
            timestamp: new Date().toISOString()
        });

        res.json(product);
    } catch (e) {
        if (e.code === 'P2025') {
            return res.status(404).json({ error: 'Product not found' });
        }
        logger.error('ADMIN_UPDATE_PRODUCT_ERROR', { error: e.message });
        res.status(500).json({ error: 'Error updating product' });
    }
}

async function deleteProduct(req, res) {
    try {
        const { id } = req.params;

        await prisma.$transaction(async (tx) => {
            // Delete related reservations and order items first
            await tx.inventoryReservation.deleteMany({ where: { productId: id } });
            await tx.product.delete({ where: { id } });
        });

        logger.info('ADMIN_PRODUCT_DELETED', {
            adminId: req.customer.userId,
            resourceId: id,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true });
    } catch (e) {
        if (e.code === 'P2025') {
            return res.status(404).json({ error: 'Product not found' });
        }
        logger.error('ADMIN_DELETE_PRODUCT_ERROR', { error: e.message });
        res.status(500).json({ error: 'Error deleting product' });
    }
}

// ---------------------------------------------------------
// ORDER MANAGEMENT
// ---------------------------------------------------------

async function listOrders(req, res) {
    try {
        const { status, from, to, page = 1, limit = 50, sort = 'desc' } = req.query;

        const where = {};
        if (status) where.status = String(status);
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(String(from));
            if (to) where.createdAt.lte = new Date(String(to));
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                orderBy: { createdAt: sort === 'asc' ? 'asc' : 'desc' },
                skip,
                take: Number(limit),
                select: {
                    id: true, email: true, status: true, createdAt: true,
                    data: true,
                    items: {
                        select: {
                            cantidad: true, precio: true,
                            product: { select: { id: true, nombre: true } }
                        }
                    }
                }
            }),
            prisma.order.count({ where })
        ]);

        const result = orders.map(o => {
            let total = 0;
            try {
                const parsed = JSON.parse(o.data);
                total = parsed.pedido?.total || 0;
            } catch { /* default */ }

            return {
                id: o.id,
                email: o.email,
                status: o.status,
                total,
                createdAt: o.createdAt.toISOString(),
                items: o.items.map(i => ({
                    quantity: i.cantidad,
                    price: i.precio,
                    productName: i.product.nombre
                }))
            };
        });

        logger.info('ADMIN_ORDERS_VIEWED', {
            adminId: req.customer.userId,
            timestamp: new Date().toISOString(),
            filters: { status, from, to, page, limit }
        });

        res.json({ orders: result, total, page: Number(page), limit: Number(limit) });
    } catch (e) {
        logger.error('ADMIN_LIST_ORDERS_ERROR', { error: e.message });
        res.status(500).json({ error: 'Error listing orders' });
    }
}

// ---------------------------------------------------------
// ANALYTICS
// ---------------------------------------------------------

async function analyticsOverview(req, res) {
    try {
        const [totalOrders, totalCustomers, activeReservations, revenueResult, productsSoldResult] = await Promise.all([
            prisma.order.count(),
            prisma.user.count(),
            prisma.inventoryReservation.count({ where: { status: 'ACTIVE' } }),
            prisma.order.findMany({
                where: { status: 'PAGADO' },
                select: { data: true }
            }),
            prisma.orderItem.aggregate({ _sum: { cantidad: true } })
        ]);

        // Calculate revenue from order data JSON
        let totalRevenue = 0;
        for (const order of revenueResult) {
            try {
                const parsed = JSON.parse(order.data);
                totalRevenue += parsed.pedido?.total || 0;
            } catch { /* skip */ }
        }

        res.json({
            totalOrders,
            totalRevenue,
            totalCustomers,
            productsSold: productsSoldResult._sum.cantidad || 0,
            activeReservations
        });
    } catch (e) {
        logger.error('ADMIN_ANALYTICS_ERROR', { error: e.message });
        res.status(500).json({ error: 'Error fetching analytics' });
    }
}

module.exports = {
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    listOrders,
    analyticsOverview
};
