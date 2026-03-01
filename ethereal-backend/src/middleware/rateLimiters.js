// =========================================================
// MIDDLEWARE: Rate Limiters
// =========================================================

const rateLimit = require('express-rate-limit');

// Global soft limiter — all routes
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiadas solicitudes. Intenta más tarde." }
});

const magicLinkLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: "Demasiadas solicitudes. Intenta más tarde." }
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Demasiados intentos de acceso al panel." }
});

const trackingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: "Demasiadas solicitudes de tracking." }
});

// Strong limiter for checkout — prevent abuse
const checkoutLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { error: "Demasiados intentos de pago. Intenta más tarde." }
});

module.exports = {
    globalLimiter,
    magicLinkLimiter,
    adminLimiter,
    trackingLimiter,
    checkoutLimiter
};
