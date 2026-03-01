// =========================================================
// MIDDLEWARE: Security — Helmet + HTTP hardening
// =========================================================

const helmet = require('helmet');

function securityHeaders() {
    return helmet({
        // Disable x-powered-by
        hidePoweredBy: true,

        // Prevent clickjacking
        frameguard: { action: 'deny' },

        // Prevent MIME sniffing
        noSniff: true,

        // XSS protection (legacy browsers)
        xssFilter: true,

        // Strict HSTS
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },

        // CSP — minimal, compatible with Stripe
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "https://js.stripe.com"],
                frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
                connectSrc: ["'self'", "https://api.stripe.com"],
                imgSrc: ["'self'", "data:", "https:"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                fontSrc: ["'self'", "https:", "data:"]
            }
        },

        // Referrer policy
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

        // DNS prefetch control
        dnsPrefetchControl: { allow: false }
    });
}

module.exports = { securityHeaders };
