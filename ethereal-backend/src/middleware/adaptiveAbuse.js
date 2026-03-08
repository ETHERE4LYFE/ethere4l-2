// =========================================================
// MIDDLEWARE: Adaptive Abuse Mitigation
// =========================================================
// O(1) Memory store using async RateLimitStore to trap and penalize:
// Brute force attacks, Refresh bursts, Cart/Checkout spam, and rapid bots.
// Health checks completely bypass this defense layer.
// =========================================================

const rateLimitStore = require('../services/abuse');
const { logger } = require('../utils/logger');
let metrics;
try {
    metrics = require('../utils/metrics');
} catch (e) {
    metrics = {};
}

// ---------------------------------------------------------
// CONSTANTS & SCORING MATRICES
// ---------------------------------------------------------
const SCORE_SOFT_THROTTLE = 10;
const SCORE_HARD_QUARANTINE = 20;

const PENALTY_RAPID_REQ = 2;
const PENALTY_4XX_REQ = 2;
const PENALTY_LOGIN_FAIL = 3;
const PENALTY_REFRESH_BURST = 5;
const PENALTY_CHECKOUT_BURST = 7;
const PENALTY_CART_SPAM = 5;

const RAPID_MS_THRESHOLD = 100;
const BURST_WINDOW_MS = 60 * 1000;
const DECAY_MS = 10000; // -1 score per 10s elapsed

// ---------------------------------------------------------
// FINGERPRINT HASH (Fast non-crypto integer hash)
// ---------------------------------------------------------
function fastHash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16);
}

function getFingerprint(req) {
    req.context = req.context || {};
    req.context.hashedIp = req.context.hashedIp || fastHash(req.ip || 'unknown');
    return `${req.context.hashedIp}|${req.headers['user-agent'] || 'unknown'}`.substring(0, 256);
}

// ---------------------------------------------------------
// CORE ENGINE
// ---------------------------------------------------------
function applyDecay(record, now) {
    const elapsed = now - record.lastActivity;
    if (elapsed > DECAY_MS) {
        const drop = Math.floor(elapsed / DECAY_MS);
        record.score = Math.max(0, record.score - drop);
    }
    return record;
}

async function getRecord(fingerprint, now) {
    let record = await rateLimitStore.get(fingerprint);
    if (!record) {
        record = {
            score: 0,
            lastActivity: now,
            refreshCount: 0,
            refreshStart: now,
            checkoutCount: 0,
            checkoutStart: now,
            cartCount: 0,
            cartStart: now
        };
    } else {
        record = applyDecay(record, now);
    }
    return record;
}

async function saveRecord(fingerprint, record, now) {
    record.lastActivity = now;
    await rateLimitStore.set(fingerprint, record);
}

// ---------------------------------------------------------
// GLOBAL MITIGATION MIDDLEWARE
// ---------------------------------------------------------
async function adaptiveAbuseGuard(req, res, next) {
    // 6. Endpoint-specific bypass: Health endpoints must bypass scoring
    if (req.originalUrl.startsWith('/health') || req.originalUrl === '/metrics') {
        return next();
    }

    const now = Date.now();
    const fingerprint = getFingerprint(req);
    const record = await getRecord(fingerprint, now);

    // Hard Quarantine Rejection
    if (record.quarantineUntil && now < record.quarantineUntil) {
        if (metrics.quarantinesTotal) metrics.quarantinesTotal.inc();
        return res.status(403).json({ error: "Access denied. Action quarantined due to abuse pattern." });
    } else if (record.quarantineUntil) {
        record.quarantineUntil = undefined;
        record.score = 0;
    }

    // Rapid request detection
    const elapsed = now - record.lastActivity;
    if (elapsed > 0 && elapsed < RAPID_MS_THRESHOLD && record.score > 0) {
        record.score += PENALTY_RAPID_REQ;
        if (metrics.abuseEventsTotal) metrics.abuseEventsTotal.inc({ type: 'rapid_request' });
    }

    // Inline Burst Evaluations
    const isRefresh = req.method === 'POST' && req.originalUrl.includes('/auth/refresh');
    const isCheckout = req.method === 'POST' && req.originalUrl.includes('/create-checkout-session');
    const isCartAdd = req.method === 'POST' && req.originalUrl.includes('/cart');

    if (isRefresh) {
        if (now - record.refreshStart > BURST_WINDOW_MS) {
            record.refreshCount = 0;
            record.refreshStart = now;
        }
        record.refreshCount++;
        if (record.refreshCount > 5) {
            record.score += PENALTY_REFRESH_BURST;
            if (metrics.abuseEventsTotal) metrics.abuseEventsTotal.inc({ type: 'refresh_burst' });
        }
    }

    if (isCheckout) {
        if (now - record.checkoutStart > BURST_WINDOW_MS) {
            record.checkoutCount = 0;
            record.checkoutStart = now;
        }
        record.checkoutCount++;
        if (record.checkoutCount > 10) {
            record.score += PENALTY_CHECKOUT_BURST;
            if (metrics.abuseEventsTotal) metrics.abuseEventsTotal.inc({ type: 'checkout_burst' });
        }
    }

    if (isCartAdd) {
        if (now - record.cartStart > BURST_WINDOW_MS) {
            record.cartCount = 0;
            record.cartStart = now;
        }
        record.cartCount++;
        if (record.cartCount > 20) {
            record.score += PENALTY_CART_SPAM;
            if (metrics.abuseEventsTotal) metrics.abuseEventsTotal.inc({ type: 'cart_spam' });
        }
    }

    // Escalation Policy Enforcement
    if (record.score >= SCORE_HARD_QUARANTINE) {
        record.quarantineUntil = now + (15 * 60 * 1000); // 15m TTL
        await saveRecord(fingerprint, record, now);
        if (metrics.quarantinesTotal) metrics.quarantinesTotal.inc();
        logger.warn('ABUSE_QUARANTINE', { fingerprint, score: record.score });
        return res.status(403).json({ error: "Access denied. Action quarantined due to abuse pattern." });
    }

    if (record.score >= SCORE_SOFT_THROTTLE) {
        await saveRecord(fingerprint, record, now);
        if (metrics.softThrottlesTotal) metrics.softThrottlesTotal.inc();
        res.setHeader('Retry-After', 60);
        logger.warn('ABUSE_THROTTLE', { fingerprint, score: record.score });
        return res.status(429).json({ error: "Too many requests. Please slow down." });
    }

    await saveRecord(fingerprint, record, now);

    // Track excessive 4xx responses organically (Hook to finish)
    res.on('finish', async () => {
        if (res.statusCode >= 400 && res.statusCode < 500 && res.statusCode !== 429 && res.statusCode !== 401 && res.statusCode !== 403) {
            const currentNow = Date.now();
            const currentRecord = await getRecord(fingerprint, currentNow);
            currentRecord.score += PENALTY_4XX_REQ;
            await saveRecord(fingerprint, currentRecord, currentNow);
            if (metrics.abuseEventsTotal) metrics.abuseEventsTotal.inc({ type: 'excessive_4xx' });
        }
    });

    next();
}

// ---------------------------------------------------------
// SPECIFIC EXPORTS (Manual checks)
// ---------------------------------------------------------
async function reportLoginFailure(req) {
    const now = Date.now();
    const fingerprint = getFingerprint(req);
    const record = await getRecord(fingerprint, now);
    record.score += PENALTY_LOGIN_FAIL;
    await saveRecord(fingerprint, record, now);
    if (metrics.loginFailuresTotal) metrics.loginFailuresTotal.inc();
    if (metrics.abuseEventsTotal) metrics.abuseEventsTotal.inc({ type: 'login_failure' });
}

async function isCheckoutAbusive(req) {
    const now = Date.now();
    const fingerprint = getFingerprint(req);
    const record = await getRecord(fingerprint, now);

    // Explicit 7. Stripe-Safe Pre-Flight verification
    if (record.score >= SCORE_HARD_QUARANTINE || record.quarantineUntil || record.score >= SCORE_SOFT_THROTTLE) {
        if (metrics.stripeAbuseBlocksTotal) metrics.stripeAbuseBlocksTotal.inc();
        return true;
    }
    return false;
}

module.exports = {
    adaptiveAbuseGuard,
    reportLoginFailure,
    isCheckoutAbusive
};
