// =========================================================
// MIDDLEWARE: Error Handlers (CORS + Global)
// =========================================================

const { logger, incrementErrorCount } = require('../utils/logger');

// CORS error handler — catches errors from CORS middleware
function corsErrorHandler(err, req, res, next) {
    if (err.message && err.message.toLowerCase().includes('cors')) {
        logger.warn('CORS_ERROR_HANDLED', { origin: req.headers.origin, path: req.originalUrl });
        return res.status(403).json({ error: 'Origin not allowed' });
    }
    next(err);
}

// Global error handler — catches all unhandled route errors
function globalErrorHandler(err, req, res, next) {
    logger.error('UNHANDLED_ROUTE_ERROR', {
        error: err.message,
        stack: err.stack,
        path: req.originalUrl,
        method: req.method
    });
    incrementErrorCount();
    res.status(500).json({ error: 'Internal server error' });
}

module.exports = {
    corsErrorHandler,
    globalErrorHandler
};
