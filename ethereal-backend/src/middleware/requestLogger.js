// =========================================================
// MIDDLEWARE: Request Correlation & HTTP Logging
// =========================================================

const { logger, incrementErrorCount } = require('../utils/logger');
const { ENABLE_METRICS } = require('../config/env');
const { httpRequestsTotal, httpRequestDurationMs } = require('../utils/metrics');

function requestLogger(req, res, next) {
    req.requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.originalUrl !== '/health' && req.originalUrl !== '/metrics') {
            logger.info('HTTP_REQUEST', {
                requestId: req.requestId,
                method: req.method,
                route: req.originalUrl,
                statusCode: res.statusCode,
                ip: req.ip,
                latencyMs: duration
            });

            if (ENABLE_METRICS) {
                // Remove dynamic trailing params for cleaner cardinality
                const routeLabel = req.route ? req.route.path : req.originalUrl.split('?')[0];
                httpRequestsTotal.inc({ method: req.method, route: routeLabel, status_code: res.statusCode });
                httpRequestDurationMs.observe({ method: req.method, route: routeLabel, status_code: res.statusCode }, duration);
            }
        }
        if (res.statusCode >= 500) {
            incrementErrorCount();
        }
    });

    next();
}

module.exports = { requestLogger };
