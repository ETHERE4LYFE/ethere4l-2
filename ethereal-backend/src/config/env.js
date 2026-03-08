// =========================================================
// CENTRALIZED ENVIRONMENT CONFIGURATION
// =========================================================
// All environment-derived values live here.
// dotenv must be loaded BEFORE requiring this module.
// =========================================================

const fs = require('fs');
const Stripe = require('stripe');
const { z } = require('zod');

// =========================================================
// ZOD SCHEMA VALIDATION
// =========================================================
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY required'),
    STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET required'),
    ADMIN_PASS_HASH: z.string().min(1, 'ADMIN_PASS_HASH required'),
    RESEND_API_KEY: z.string().optional(),
    ADMIN_EMAIL: z.string().email().default('ethere4lyfe@gmail.com'),
    FRONTEND_URL: z.string().url().default('https://ethere4l.com'),
    COOKIE_DOMAIN: z.string().optional(),
    DATABASE_URL: z.string().url('DATABASE_URL connection string required'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
    ENABLE_METRICS: z.coerce.boolean().default(false),
    IP_HASH_PEPPER: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production' && !data.IP_HASH_PEPPER) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "IP_HASH_PEPPER is REQUIRED in production for GDPR-compliant logging.",
            path: ["IP_HASH_PEPPER"]
        });
    }
});

let parsedEnv;
try {
    parsedEnv = envSchema.parse(process.env);
} catch (error) {
    if (error instanceof z.ZodError) {
        console.error('❌ FATAL ENVIRONMENT VALIDATION FAILED:');
        error.errors.forEach(err => {
            console.error(`   - ${err.path.join('.')}: ${err.message}`);
        });
    } else {
        console.error('❌ FATAL ENVIRONMENT ERROR:', error);
    }
    process.exit(1);
}

// --- Stripe ---
const stripe = Stripe(parsedEnv.STRIPE_SECRET_KEY.trim());

// --- JWT ---
const JWT_SECRET = parsedEnv.JWT_SECRET;

// --- Auth ---
const ADMIN_PASS_HASH = parsedEnv.ADMIN_PASS_HASH;
const STRIPE_WEBHOOK_SECRET = parsedEnv.STRIPE_WEBHOOK_SECRET.trim();

// --- Observability (Phase 11) ---
const IS_PRODUCTION = parsedEnv.NODE_ENV === 'production';
const LOG_LEVEL = parsedEnv.LOG_LEVEL || (IS_PRODUCTION ? 'info' : 'debug');
const ENABLE_METRICS = parsedEnv.ENABLE_METRICS;
const IP_HASH_PEPPER = parsedEnv.IP_HASH_PEPPER || 'dev-dummy-pepper-xyz';

const PORT = parsedEnv.PORT;
const FRONTEND_URL = parsedEnv.FRONTEND_URL;

// --- Cookie ---
const COOKIE_DOMAIN = parsedEnv.COOKIE_DOMAIN;

// --- Email ---
const RESEND_API_KEY = parsedEnv.RESEND_API_KEY;
const ADMIN_EMAIL = parsedEnv.ADMIN_EMAIL;
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
    isRailway,
    LOG_LEVEL,
    ENABLE_METRICS,
    IP_HASH_PEPPER
};
