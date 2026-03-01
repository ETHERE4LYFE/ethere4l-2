// =========================================================
// CONTROLLER: Health — root, health check, metrics
// =========================================================

const { db, dbPersistent } = require('../database');
const { BACKEND_VERSION } = require('../config/constants');
const { UNIQUE_ORIGINS } = require('../config/cors');
const { RESEND_API_KEY, COOKIE_DOMAIN } = require('../config/env');
const { logger, getErrorCountLastHour } = require('../utils/logger');
const { parseSafeNumber } = require('../utils/helpers');

// Injected at startup
let SERVER_START_TIME = Date.now();

function setStartTime(t) { SERVER_START_TIME = t; }

function getRoot(req, res) {
    res.json({
        status: 'online',
        service: 'ETHERE4L Backend v' + BACKEND_VERSION,
        mode: 'PostgreSQL + Prisma + Stripe + Auth'
    });
}

async function getHealth(req, res) {
    let dbStatus = 'error';
    try {
        if (dbPersistent) {
            const test = await db.$queryRawUnsafe('SELECT 1 as ok');
            dbStatus = test && test[0].ok === 1 ? 'connected' : 'error';
        }
    } catch (e) {
        dbStatus = 'error';
    }

    const stripeStatus = process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing';
    const resendStatus = RESEND_API_KEY ? 'configured' : 'missing';
    const overallStatus = (dbStatus === 'connected' && stripeStatus === 'configured') ? 'ok' : 'degraded';

    res.json({
        status: overallStatus,
        db: dbStatus,
        dbPersistent,
        stripe: stripeStatus,
        email: resendStatus,
        uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
        memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        },
        node: process.version,
        version: BACKEND_VERSION,
        cors: { originsCount: UNIQUE_ORIGINS.length, preflightEnabled: true },
        cookieDomain: COOKIE_DOMAIN || 'not set',
        timestamp: new Date().toISOString()
    });
}

async function getMetrics(req, res) {
    let pedidosHoy = 0;
    let totalVentasHoy = 0;
    let totalPedidos = 0;

    try {
        if (dbPersistent) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            pedidosHoy = await db.order.count({
                where: { createdAt: { gte: today } }
            });

            const ventasHoy = await db.order.findMany({
                where: {
                    status: 'PAGADO',
                    createdAt: { gte: today }
                },
                select: { data: true }
            });

            for (const row of ventasHoy) {
                try {
                    const parsed = JSON.parse(row.data);
                    totalVentasHoy += parseSafeNumber(parsed.pedido?.total, 0);
                } catch (e) { /* skip */ }
            }

            totalPedidos = await db.order.count();
        }
    } catch (e) {
        logger.error('METRICS_DB_ERROR', { error: e.message });
    }

    res.json({
        pedidosHoy,
        totalVentasHoy: Math.round(totalVentasHoy * 100) / 100,
        totalPedidos,
        erroresUltimaHora: getErrorCountLastHour(),
        uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
        dbPersistent,
        version: BACKEND_VERSION,
        timestamp: new Date().toISOString()
    });
}

module.exports = { getRoot, getHealth, getMetrics, setStartTime };
