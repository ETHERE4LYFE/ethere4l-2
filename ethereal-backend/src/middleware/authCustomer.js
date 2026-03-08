// =========================================================
// MIDDLEWARE: Customer Session Authentication (Cookie/Bearer)
// =========================================================
// Dual-mode: reads session from HttpOnly cookie first,
// falls back to Authorization Bearer header for backward compat.
// Validates session against DB (not just JWT signature).
// =========================================================

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, getClearCookieOptions } = require('../config/cookie');

function verifyCustomerSession(req, res, next) {
    let token = req.cookies[ACCESS_COOKIE_NAME];

    if (!token) {
        const auth = req.headers.authorization;
        if (auth && auth.startsWith('Bearer ')) {
            token = auth.split(' ')[1];
        }
    }

    if (!token) {
        return res.sendStatus(401);
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.scope !== 'customer') {
            return res.sendStatus(403);
        }

        req.customer = {
            email: decoded.email,
            userId: decoded.userId,
            role: decoded.role || 'CUSTOMER'
        };

        next();

    } catch (e) {
        // If access token is expired, we don't automatically clear cookies here, Let the client call /refresh
        // If we clear them here, the frontend loses the refresh token before it gets a chance to use it.
        return res.sendStatus(401);
    }
}

module.exports = { verifyCustomerSession };
