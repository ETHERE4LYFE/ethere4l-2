// =========================================================
// SERVICE: Inventory — Stock validation, reservations, cleanup
// =========================================================
// No Express req/res. Pure business logic.
// =========================================================

const { logger } = require('../../utils/logger');
const { parseSafeNumber } = require('../../utils/helpers');

// Now importing Prisma client
const prisma = require('../../database/prismaClient');

async function checkStock(items) {
    for (const item of items) {
        const cantidadLimpia = parseSafeNumber(item.cantidad, 1);
        const inventoryRow = await prisma.product.findUnique({
            where: { id: String(item.id) },
            select: { stock: true, reservations: { select: { qty: true } } }
        });

        if (inventoryRow) {
            const reserved = inventoryRow.reservations.reduce((acc, r) => acc + r.qty, 0);
            const available = inventoryRow.stock - reserved;
            if (available < cantidadLimpia) {
                return {
                    ok: false,
                    productId: item.id,
                    productName: item.nombre || item.id,
                    requested: cantidadLimpia,
                    available: Math.max(0, available)
                };
            }
        }
    }

    return { ok: true };
}

// Phase 9.1: reserveStock now accepts a Prisma transaction client (tx)
// All operations must use tx instead of the global prisma client to guarantee atomicity.
async function reserveStock(items, tx) {
    for (const item of items) {
        const cantidadLimpia = parseSafeNumber(item.cantidad, 1);
        const inv = await tx.product.findUnique({
            where: { id: String(item.id) },
            select: { stock: true, reservations: { select: { qty: true } } }
        });

        if (inv) {
            const reserved = inv.reservations.reduce((acc, r) => acc + r.qty, 0);
            const available = inv.stock - reserved;
            if (available < cantidadLimpia) {
                throw new Error(`STOCK_INSUFICIENTE:${item.id}:${available}`);
            }
        }
    }

    // Process reservations transactionally within the provided tx
    for (const item of items) {
        const cantidadLimpia = parseSafeNumber(item.cantidad, 1);
        await tx.inventoryReservation.create({
            data: {
                productId: String(item.id),
                qty: cantidadLimpia
            }
        });
    }
}

// Phase 9.1: confirmStock now accepts a Prisma transaction client (tx)
async function confirmStock(items, tx) {
    // 1. Decrement stock
    for (const item of items) {
        const qty = parseSafeNumber(item.cantidad, 1);
        await tx.product.update({
            where: { id: String(item.id) },
            data: {
                stock: { decrement: qty }
            }
        });
    }

    // 2. Resolve the reservations
    for (const item of items) {
        const qty = parseSafeNumber(item.cantidad, 1);
        const res = await tx.inventoryReservation.findMany({
            where: { productId: String(item.id) },
            orderBy: { createdAt: 'asc' }
        });

        let toDeleteQty = qty;
        for (const r of res) {
            if (toDeleteQty <= 0) break;
            if (r.qty <= toDeleteQty) {
                await tx.inventoryReservation.delete({ where: { id: r.id } });
                toDeleteQty -= r.qty;
            } else {
                await tx.inventoryReservation.update({
                    where: { id: r.id },
                    data: { qty: { decrement: toDeleteQty } }
                });
                toDeleteQty = 0;
            }
        }
    }
}

async function releaseStaleReservations() {
    try {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const staleOrders = await prisma.order.findMany({
            where: {
                status: 'PENDIENTE',
                createdAt: { lt: twoHoursAgo }
            }
        });

        if (staleOrders.length === 0) return;

        for (const order of staleOrders) {
            let parsed;
            try {
                parsed = JSON.parse(order.data);
            } catch { continue; }

            const items = parsed.pedido?.items || [];

            // Delete reservations
            for (const item of items) {
                const qty = parseSafeNumber(item.cantidad, 1);
                const res = await prisma.inventoryReservation.findMany({
                    where: { productId: String(item.id) },
                    orderBy: { createdAt: 'desc' } // Release newest first
                });

                let toDeleteQty = qty;
                for (const r of res) {
                    if (toDeleteQty <= 0) break;
                    if (r.qty <= toDeleteQty) {
                        await prisma.inventoryReservation.delete({ where: { id: r.id } });
                        toDeleteQty -= r.qty;
                    } else {
                        await prisma.inventoryReservation.update({
                            where: { id: r.id },
                            data: { qty: { decrement: toDeleteQty } }
                        });
                        toDeleteQty = 0;
                    }
                }
            }

            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'EXPIRADO' }
            });
        }

        if (staleOrders.length > 0) {
            logger.info('STALE_RESERVATIONS_CLEANED', { count: staleOrders.length });
        }
    } catch (e) {
        logger.error('CLEANUP_ERROR', { error: e.message });
    }
}

module.exports = {
    checkStock,
    reserveStock,
    confirmStock,
    releaseStaleReservations
};
