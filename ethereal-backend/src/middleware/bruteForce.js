// =========================================================
// MIDDLEWARE: Brute Force Protection (admin login)
// =========================================================
// In-memory tracker for failed login attempts.
// Locks out after MAX_ATTEMPTS within WINDOW_MS.
// Resets after LOCKOUT_MS cooldown.
// =========================================================

const { logger } = require('../utils/logger');

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;    // 15 minutes
const LOCKOUT_MS = 30 * 60 * 1000;   // 30 minutes lockout

// Map<ip, { count, firstAttempt, lockedUntil }>
const attempts = new Map();

// Cleanup stale entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of attempts) {
        if (data.lockedUntil && now > data.lockedUntil) {
            attempts.delete(ip);
        } else if (now - data.firstAttempt > WINDOW_MS) {
            attempts.delete(ip);
        }
    }
}, 10 * 60 * 1000);

function bruteForceGuard(req, res, next) {
    const ip = req.ip;
    const record = attempts.get(ip);

    if (record && record.lockedUntil) {
        if (Date.now() < record.lockedUntil) {
            const remainingMs = record.lockedUntil - Date.now();
            const remainingMin = Math.ceil(remainingMs / 60000);
            logger.warn('BRUTE_FORCE_BLOCKED', { ip, remainingMin });
            return res.status(429).json({
                error: `Demasiados intentos fallidos. Intenta en ${remainingMin} minutos.`
            });
        }
        // Lockout expired
        attempts.delete(ip);
    }

    next();
}

function recordFailedAttempt(ip) {
    const now = Date.now();
    const record = attempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: null };

    // Reset if window expired
    if (now - record.firstAttempt > WINDOW_MS) {
        record.count = 0;
        record.firstAttempt = now;
    }

    record.count++;

    if (record.count >= MAX_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_MS;
        logger.warn('BRUTE_FORCE_LOCKOUT', { ip, attempts: record.count });
    }

    attempts.set(ip, record);
}

function resetAttempts(ip) {
    attempts.delete(ip);
}

module.exports = { bruteForceGuard, recordFailedAttempt, resetAttempts };
