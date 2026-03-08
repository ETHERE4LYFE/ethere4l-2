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
const reservationWorker = require('./src/workers/reservationExpirationWorker');

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

    // Phase 19: Start reservation expiration worker
    reservationWorker.start();
});

// =========================================================
// PROCESS HANDLERS & GRACEFUL SHUTDOWN
// =========================================================
const { db } = require('./src/database');

let isShuttingDown = false;

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info('SERVER_SHUTDOWN_INIT', { signal });
    console.log(`\n🛑 Recibido ${signal}, iniciando apagado seguro...`);

    // 10 second fallback forced kill
    setTimeout(() => {
        logger.error('SERVER_SHUTDOWN_TIMEOUT', { reason: 'Forced exit after 10s' });
        console.error('🚨 Fallback timeout. Forzando salida.');
        process.exit(1);
    }, 10000).unref();

    try {
        // Stop reservation worker
        reservationWorker.stop();

        // Wait for in-flight reservation cycle to finish (max 5s)
        const waitStart = Date.now();
        while (reservationWorker.isInFlight() && Date.now() - waitStart < 5000) {
            await new Promise(r => setTimeout(r, 100));
        }

        // Stop accepting new connections & finish in-flight ones
        await new Promise((resolve) => server.close(resolve));
        logger.info('SERVER_CONNECTIONS_CLOSED');

        // Terminate Prisma safely
        if (db) {
            await db.$disconnect();
            logger.info('DB_DISCONNECTED');
        }

        console.log('✅ Apagado completo.');
        process.exit(0);
    } catch (err) {
        logger.error('SERVER_SHUTDOWN_ERROR', { error: err.message });
        process.exit(1);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT_EXCEPTION', { error: err.message, stack: err.stack });
    incrementErrorCount();
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
    logger.error('UNHANDLED_REJECTION', { reason: String(reason) });
    incrementErrorCount();
    gracefulShutdown('UNHANDLED_REJECTION');
});