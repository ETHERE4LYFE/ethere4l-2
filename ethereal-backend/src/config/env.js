// =========================================================
// CENTRALIZED ENVIRONMENT CONFIGURATION
// =========================================================
// All environment-derived values live here.
// dotenv must be loaded BEFORE requiring this module.
// =========================================================

const fs = require('fs');
const Stripe = require('stripe');

// --- Stripe ---
const stripe = Stripe((process.env.STRIPE_SECRET_KEY || '').trim());

// --- JWT ---
const JWT_SECRET = (function() {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production') {
        throw new Error('❌ FATAL: JWT_SECRET is required in production. Set it in Railway environment variables.');
    }
    console.warn('⚠️ Usando JWT_SECRET de desarrollo. NO usar en producción.');
    return 'secret_dev_key_change_in_prod';
})();

// --- Auth ---
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH;
const STRIPE_WEBHOOK_SECRET = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();

// --- Environment ---
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://ethere4l.com';

// --- Cookie ---
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

// --- Email ---
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ethere4lyfe@gmail.com';
const SENDER_EMAIL = 'orders@ethere4l.com';

// --- Railway Detection ---
const RAILWAY_VOLUME = '/app/data';
const isRailway = fs.existsSync(RAILWAY_VOLUME);

module.exports = {
    stripe,
    JWT_SECRET,
    ADMIN_PASS_HASH,
    STRIPE_WEBHOOK_SECRET,
    IS_PRODUCTION,
    PORT,
    FRONTEND_URL,
    COOKIE_DOMAIN,
    RESEND_API_KEY,
    ADMIN_EMAIL,
    SENDER_EMAIL,
    RAILWAY_VOLUME,
    isRailway
};
