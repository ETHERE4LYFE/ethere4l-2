// =========================================================
// METRICS UTILITY
// =========================================================
// Initializes prom-client and exports standard observability metrics.
// =========================================================

const promClient = require('prom-client');
const { ENABLE_METRICS } = require('../config/env');

const Registry = promClient.Registry;
const register = new Registry();

// Collect default metrics (memory, cpu, event loop, etc.)
if (ENABLE_METRICS) {
    promClient.collectDefaultMetrics({ register });
}

// ---------------------------------------------------------
// CUSTOM METRICS
// ---------------------------------------------------------

const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

const httpRequestDurationMs = new promClient.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [50, 100, 250, 500, 1000, 2500],
    registers: [register]
});

const authFailuresTotal = new promClient.Counter({
    name: 'auth_failures_total',
    help: 'Total number of authentication failures',
    labelNames: ['type'],
    registers: [register]
});

const stripeCheckoutFailuresTotal = new promClient.Counter({
    name: 'stripe_checkout_failures_total',
    help: 'Total number of failed Stripe checkout session creations',
    registers: [register]
});

const dbSlowQueriesTotal = new promClient.Counter({
    name: 'db_slow_queries_total',
    help: 'Total number of database queries exceeding the slow threshold',
    registers: [register]
});

// --- Phase 13 Abuse Metrics ---
const abuseEventsTotal = new promClient.Counter({
    name: 'abuse_events_total',
    help: 'Total number of detected abuse pattern events',
    labelNames: ['type'],
    registers: [register]
});

const softThrottlesTotal = new promClient.Counter({
    name: 'soft_throttles_total',
    help: 'Total number of 429 soft throttles issued',
    registers: [register]
});

const quarantinesTotal = new promClient.Counter({
    name: 'quarantines_total',
    help: 'Total number of 403 hard quarantines issued',
    registers: [register]
});

const loginFailuresTotal = new promClient.Counter({
    name: 'login_failures_total',
    help: 'Total number of login failures',
    registers: [register]
});

const stripeAbuseBlocksTotal = new promClient.Counter({
    name: 'stripe_abuse_blocks_total',
    help: 'Total number of Stripe checkout blocks due to abuse',
    registers: [register]
});

// --- Phase 19 Reservation Expiration Metrics ---
const reservationsExpiredTotal = new promClient.Counter({
    name: 'inventory_reservations_expired_total',
    help: 'Total number of expired inventory reservations',
    registers: [register]
});

const reservationExpirationDuration = new promClient.Histogram({
    name: 'reservation_expiration_worker_duration_seconds',
    help: 'Duration of reservation expiration worker cycles in seconds',
    buckets: [0.1, 0.5, 1, 2, 5, 10],
    registers: [register]
});

const reservationsPendingGauge = new promClient.Gauge({
    name: 'inventory_reservations_pending',
    help: 'Current number of active (pending) inventory reservations',
    registers: [register]
});

module.exports = {
    register,
    httpRequestsTotal,
    httpRequestDurationMs,
    authFailuresTotal,
    stripeCheckoutFailuresTotal,
    dbSlowQueriesTotal,
    abuseEventsTotal,
    softThrottlesTotal,
    quarantinesTotal,
    loginFailuresTotal,
    stripeAbuseBlocksTotal,
    reservationsExpiredTotal,
    reservationExpirationDuration,
    reservationsPendingGauge
};
