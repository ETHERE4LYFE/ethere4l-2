// =========================================================
// LOGGER — Structured logging + file persistence
// =========================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { isRailway, RAILWAY_VOLUME, IS_PRODUCTION, IP_HASH_PEPPER, LOG_LEVEL } = require('../config/env');

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLogLevel = LOG_LEVELS[LOG_LEVEL] ?? 1;

const LOG_DIR = isRailway ? path.join(RAILWAY_VOLUME, 'logs') : path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Sensitive keys to never log
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'hash', 'authorization', 'cookie', 'api_key'];

function sanitizeContext(ctx) {
    if (!ctx || typeof ctx !== 'object') return ctx;
    const clean = { ...ctx };
    for (const key of Object.keys(clean)) {
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_KEYS.some(s => lowerKey.includes(s))) {
            clean[key] = '[REDACTED]';
        }
    }
    return clean;
}

function hashIp(ip) {
    if (!ip) return 'unknown';
    return crypto.createHash('sha256').update(ip + IP_HASH_PEPPER).digest('hex').substring(0, 16);
}

function writeLogToFile(level, message, context) {
    if (LOG_LEVELS[level.toLowerCase()] < currentLogLevel) return;

    if (context && context.ip) {
        context.hashedIp = hashIp(context.ip);
        delete context.ip;
    }

    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...sanitizeContext(context)
    };
    try {
        fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
    } catch (e) { /* silent */ }
}

const logger = {
    info: (msg, ctx = {}) => {
        if (LOG_LEVELS['info'] < currentLogLevel) return;
        writeLogToFile('INFO', msg, ctx);
        console.log(JSON.stringify({ level: 'INFO', ts: new Date().toISOString(), msg, ...sanitizeContext(ctx) }));
    },
    warn: (msg, ctx = {}) => {
        if (LOG_LEVELS['warn'] < currentLogLevel) return;
        writeLogToFile('WARN', msg, ctx);
        console.warn(JSON.stringify({ level: 'WARN', ts: new Date().toISOString(), msg, ...sanitizeContext(ctx) }));
    },
    error: (msg, ctx = {}) => {
        if (LOG_LEVELS['error'] < currentLogLevel) return;
        writeLogToFile('ERROR', msg, ctx);
        console.error(JSON.stringify({ level: 'ERROR', ts: new Date().toISOString(), msg, ...sanitizeContext(ctx) }));
    },
    debug: (msg, ctx = {}) => {
        if (LOG_LEVELS['debug'] < currentLogLevel) return;
        writeLogToFile('DEBUG', msg, ctx);
        console.debug(JSON.stringify({ level: 'DEBUG', ts: new Date().toISOString(), msg, ...sanitizeContext(ctx) }));
    }
};

let errorCountLastHour = 0;
let errorCountResetAt = Date.now() + 3600000;

function incrementErrorCount() {
    const now = Date.now();
    if (now > errorCountResetAt) {
        errorCountLastHour = 0;
        errorCountResetAt = now + 3600000;
    }
    errorCountLastHour++;
}

function getErrorCountLastHour() {
    const now = Date.now();
    if (now > errorCountResetAt) {
        errorCountLastHour = 0;
        errorCountResetAt = now + 3600000;
    }
    return errorCountLastHour;
}

module.exports = {
    logger,
    incrementErrorCount,
    getErrorCountLastHour,
    hashIp
};
