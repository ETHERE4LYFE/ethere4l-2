// =========================================================
// SERVICE: Customers — Customer lookup, order history
// =========================================================
// No Express req/res. Pure business logic.
// =========================================================

const prisma = require('../../database/prismaClient');

async function hasOrders(email) {
    const order = await prisma.order.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true }
    });
    return !!order;
}

async function getCustomerByEmail(email) {
    const lowerEmail = email.toLowerCase();

    const orders = await prisma.order.findMany({
        where: { email: { equals: lowerEmail, mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            status: true,
            createdAt: true,
            data: true
        }
    });

    return {
        email: lowerEmail,
        orderCount: orders.length,
        orders: orders.map(o => ({
            ...o,
            // Convert JS Date to ISO string to match SQLite behaviour
            created_at: o.createdAt.toISOString()
        }))
    };
}

module.exports = {
    hasOrders,
    getCustomerByEmail
};
