// =========================================================
// MIDDLEWARE: Request Correlation & HTTP Logging
// =========================================================

const { logger, incrementErrorCount } = require('../utils/logger');

function requestLogger(req, res, next) {
    req.requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.originalUrl !== '/health' && req.originalUrl !== '/metrics') {
            logger.info('HTTP_REQUEST', {
                requestId: req.requestId,
                method: req.method,
                path: req.originalUrl,
                status: res.statusCode,
                ip: req.ip,
                durationMs: duration
            });
        }
        if (res.statusCode >= 500) {
            incrementErrorCount();
        }
    });

    next();
}

module.exports = { requestLogger };
