// =========================================================
// MIDDLEWARE: Rate Limiters
// =========================================================

const rateLimit = require('express-rate-limit');

const magicLinkLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: "Demasiadas solicitudes. Intenta más tarde."
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Demasiados intentos de acceso al panel."
});

const trackingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: "Demasiadas solicitudes de tracking."
});

module.exports = {
    magicLinkLimiter,
    adminLimiter,
    trackingLimiter
};
