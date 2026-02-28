// =========================================================
// LOGGER — Structured logging + file persistence
// =========================================================

const fs = require('fs');
const path = require('path');
const { isRailway, RAILWAY_VOLUME } = require('../config/env');

const LOG_DIR = isRailway ? path.join(RAILWAY_VOLUME, 'logs') : path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}
const LOG_FILE = path.join(LOG_DIR, 'app.log');

function writeLogToFile(level, message, context) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context
    };
    try {
        fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
    } catch (e) { /* silent */ }
}

const logger = {
    info: (msg, ctx = {}) => {
        console.log(`[INFO] ${new Date().toISOString()} | ${msg} | ${JSON.stringify(ctx)}`);
        writeLogToFile('INFO', msg, ctx);
    },
    warn: (msg, ctx = {}) => {
        console.warn(`[WARN] ${new Date().toISOString()} | ${msg} | ${JSON.stringify(ctx)}`);
        writeLogToFile('WARN', msg, ctx);
    },
    error: (msg, ctx = {}) => {
        console.error(`[ERROR] ${new Date().toISOString()} | ${msg} | ${JSON.stringify(ctx)}`);
        writeLogToFile('ERROR', msg, ctx);
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
