// =========================================================
// SERVER.JS — ENTRY POINT ONLY
// =========================================================
// Responsibilities:
//   - Load environment variables
//   - Import the Express app
//   - Start HTTP server
//   - Handle process signals and errors
// =========================================================

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = require('./src/app');

// =========================================================
// CONFIG
// =========================================================
const { PORT, STRIPE_WEBHOOK_SECRET, IS_PRODUCTION, COOKIE_DOMAIN, isRailway } = require('./src/config/env');
const { COOKIE_NAME } = require('./src/config/cookie');
const { BACKEND_VERSION } = require('./src/config/constants');
const { UNIQUE_ORIGINS } = require('./src/config/cors');
const { logger, incrementErrorCount } = require('./src/utils/logger');
const emailService = require('./src/services/email/emailService');
const { setStartTime } = require('./src/controllers/healthController');

// =========================================================
// START SERVER
// =========================================================
const SERVER_START_TIME = Date.now();
setStartTime(SERVER_START_TIME);

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ETHERE4L Backend V${BACKEND_VERSION} corriendo en puerto ${PORT}`);
    console.log(`🔒 Auth: HttpOnly Cookie (Phase 0 Security + Safari iOS Fix)`);
    console.log(`🍪 Cookie: ${COOKIE_NAME} | SameSite=${IS_PRODUCTION ? 'None' : 'Lax'} | Secure=${IS_PRODUCTION} | Domain=${COOKIE_DOMAIN || 'not set'}`);
    console.log(`🌐 CORS: ${UNIQUE_ORIGINS.length} origins | preflight: explicit | credentials: true | Vary: Origin`);
    console.log(`📧 Email: ${emailService.isConfigured() ? 'Resend ACTIVE' : 'DISABLED'}`);
    console.log(`💳 Stripe: ${STRIPE_WEBHOOK_SECRET ? 'Webhook configured' : 'NO webhook secret'}`);
    console.log(`📦 API Endpoints: /api/catalogo, /api/productos (resilience layer added)`);
    logger.info('SERVER_STARTED', {
        port: PORT,
        version: BACKEND_VERSION,
        railway: isRailway,
        authMode: 'httponly_cookie',
        corsOrigins: UNIQUE_ORIGINS.length,
        emailActive: emailService.isConfigured(),
        stripeWebhook: !!STRIPE_WEBHOOK_SECRET,
        cookieDomain: COOKIE_DOMAIN || 'not_set',
        safariIOSFix: true
    });
});

// =========================================================
// PROCESS HANDLERS
// =========================================================
process.on('SIGTERM', () => {
    logger.info('SERVER_SHUTDOWN', { reason: 'SIGTERM' });
    server.close(() => console.log('Servidor cerrado.'));
});

process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT_EXCEPTION', { error: err.message, stack: err.stack });
    incrementErrorCount();
});

process.on('unhandledRejection', (reason) => {
    logger.error('UNHANDLED_REJECTION', { reason: String(reason) });
    incrementErrorCount();
});