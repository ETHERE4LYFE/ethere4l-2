// =========================================================
// MIDDLEWARE: Error Handlers (CORS + Global)
// =========================================================

const { logger, incrementErrorCount } = require('../utils/logger');
const { IS_PRODUCTION } = require('../config/env');

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
    // Log full details internally
    logger.error('UNHANDLED_ROUTE_ERROR', {
        error: err.message,
        stack: IS_PRODUCTION ? undefined : err.stack,
        path: req.originalUrl,
        method: req.method
    });
    incrementErrorCount();

    // Sanitize response — never expose stack traces or internal details in production
    const statusCode = err.statusCode || 500;
    const response = {
        error: statusCode === 500
            ? 'Internal server error'
            : (err.message || 'Error processing request')
    };

    // Only include stack in development
    if (!IS_PRODUCTION && err.stack) {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

module.exports = {
    corsErrorHandler,
    globalErrorHandler
};
