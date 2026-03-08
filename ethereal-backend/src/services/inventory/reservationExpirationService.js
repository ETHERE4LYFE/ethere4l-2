// =========================================================
// SERVICE: Reservation Expiration — TTL-based cleanup
// =========================================================
// Detects ACTIVE reservations past their expiresAt.
// Restores product inventory transactionally.
// Uses FOR UPDATE SKIP LOCKED for horizontal scaling safety.
// =========================================================

const prisma = require('../../database/prismaClient');
const { logger } = require('../../utils/logger');
const {
    reservationsExpiredTotal,
    reservationExpirationDuration,
    reservationsPendingGauge
} = require('../../utils/metrics');

const BATCH_SIZE = 100;

async function expireReservations() {
    const workerRunId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const startTime = Date.now();

    logger.info('RESERVATION_CLEANUP_STARTED', { workerRunId });

    try {
        // 1. Find expired reservation IDs with row-level locking
        const expiredRows = await prisma.$queryRaw`
            SELECT id, "productId", qty
            FROM "InventoryReservation"
            WHERE status = 'ACTIVE'
              AND "expiresAt" < NOW()
            ORDER BY "expiresAt" ASC
            LIMIT ${BATCH_SIZE}
            FOR UPDATE SKIP LOCKED
        `;

        if (expiredRows.length === 0) {
            const duration = (Date.now() - startTime) / 1000;
            reservationExpirationDuration.observe(duration);
            logger.info('RESERVATION_CLEANUP_COMPLETED', {
                workerRunId,
                expired: 0,
                duration: `${duration.toFixed(3)}s`
            });
            return 0;
        }

        // 2. Process each expired reservation inside a transaction
        await prisma.$transaction(async (tx) => {
            for (const row of expiredRows) {
                // Restore inventory
                await tx.product.update({
                    where: { id: row.productId },
                    data: { stock: { increment: row.qty } }
                });

                // Mark reservation as EXPIRED
                await tx.inventoryReservation.update({
                    where: { id: row.id },
                    data: { status: 'EXPIRED' }
                });

                logger.info('RESERVATION_EXPIRED', {
                    workerRunId,
                    reservationId: row.id,
                    productId: row.productId,
                    quantity: row.qty,
                    expiredAt: new Date().toISOString()
                });

                reservationsExpiredTotal.inc();
            }
        }, {
            isolationLevel: 'Serializable'
        });

        const duration = (Date.now() - startTime) / 1000;
        reservationExpirationDuration.observe(duration);

        logger.info('RESERVATION_CLEANUP_COMPLETED', {
            workerRunId,
            expired: expiredRows.length,
            duration: `${duration.toFixed(3)}s`
        });

        return expiredRows.length;

    } catch (e) {
        const duration = (Date.now() - startTime) / 1000;
        reservationExpirationDuration.observe(duration);

        logger.error('RESERVATION_CLEANUP_ERROR', {
            workerRunId,
            error: e.message,
            stack: e.stack,
            duration: `${duration.toFixed(3)}s`
        });

        return 0;
    }
}

async function updatePendingGauge() {
    try {
        const count = await prisma.inventoryReservation.count({
            where: { status: 'ACTIVE' }
        });
        reservationsPendingGauge.set(count);
    } catch {
        // Non-critical, silently ignore
    }
}

module.exports = { expireReservations, updatePendingGauge };
