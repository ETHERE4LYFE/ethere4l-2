// =========================================================
// LOGGER — Structured logging + file persistence
// =========================================================

const fs = require('fs');
const path = require('path');
const { isRailway, RAILWAY_VOLUME, IS_PRODUCTION } = require('../config/env');

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

function writeLogToFile(level, message, context) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context: sanitizeContext(context)
    };
    try {
        fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
    } catch (e) { /* silent */ }
}

const logger = {
    info: (msg, ctx = {}) => {
        const sanitized = sanitizeContext(ctx);
        if (IS_PRODUCTION) {
            // Structured JSON output in production
            process.stdout.write(JSON.stringify({ level: 'INFO', ts: new Date().toISOString(), msg, ...sanitized }) + '\n');
        } else {
            console.log(`[INFO] ${new Date().toISOString()} | ${msg} | ${JSON.stringify(sanitized)}`);
        }
        writeLogToFile('INFO', msg, sanitized);
    },
    warn: (msg, ctx = {}) => {
        const sanitized = sanitizeContext(ctx);
        if (IS_PRODUCTION) {
            process.stdout.write(JSON.stringify({ level: 'WARN', ts: new Date().toISOString(), msg, ...sanitized }) + '\n');
        } else {
            console.warn(`[WARN] ${new Date().toISOString()} | ${msg} | ${JSON.stringify(sanitized)}`);
        }
        writeLogToFile('WARN', msg, sanitized);
    },
    error: (msg, ctx = {}) => {
        const sanitized = sanitizeContext(ctx);
        if (IS_PRODUCTION) {
            process.stderr.write(JSON.stringify({ level: 'ERROR', ts: new Date().toISOString(), msg, ...sanitized }) + '\n');
        } else {
            console.error(`[ERROR] ${new Date().toISOString()} | ${msg} | ${JSON.stringify(sanitized)}`);
        }
        writeLogToFile('ERROR', msg, sanitized);
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
    getErrorCountLastHour
};
