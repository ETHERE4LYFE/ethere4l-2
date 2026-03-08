// =========================================================
// WORKER: Reservation Expiration — Background Interval
// =========================================================
// Runs every 60 seconds. Expires stale reservations.
// Safe for horizontal scaling via FOR UPDATE SKIP LOCKED.
// Supports graceful shutdown (clearInterval).
// =========================================================

const { expireReservations, updatePendingGauge } = require('../services/inventory/reservationExpirationService');
const { logger } = require('../utils/logger');

const WORKER_INTERVAL_MS = 60 * 1000; // 60 seconds

let intervalId = null;
let isRunning = false;

async function runCycle() {
    if (isRunning) return; // Skip if previous cycle still in-flight
    isRunning = true;

    try {
        await expireReservations();
        await updatePendingGauge();
    } catch (e) {
        logger.error('RESERVATION_WORKER_ERROR', { error: e.message });
    } finally {
        isRunning = false;
    }
}

function start() {
    logger.info('RESERVATION_WORKER_STARTED', { intervalMs: WORKER_INTERVAL_MS });

    // Run first cycle after a short delay to let DB warm up
    setTimeout(runCycle, 5000);

    intervalId = setInterval(runCycle, WORKER_INTERVAL_MS);
}

function stop() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        logger.info('RESERVATION_WORKER_STOPPED');
    }
}

function isInFlight() {
    return isRunning;
}

module.exports = { start, stop, isInFlight };
