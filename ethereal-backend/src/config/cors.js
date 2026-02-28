// =========================================================
// CORS CONFIGURATION (ENHANCED)
// =========================================================

const { FRONTEND_URL } = require('./env');
const { logger } = require('../utils/logger');

const ALLOWED_ORIGINS = [
    'https://ethere4l.com',
    'https://www.ethere4l.com',
    'https://ethereal-frontend.netlify.app',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3001',
    'http://localhost:3000',
    FRONTEND_URL
].filter(Boolean);

const UNIQUE_ORIGINS = [...new Set(ALLOWED_ORIGINS)];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (UNIQUE_ORIGINS.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        logger.warn('CORS_BLOCKED', { origin });
        return callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 204
};

module.exports = {
    corsOptions,
    UNIQUE_ORIGINS
};
