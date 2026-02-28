// =========================================================
// MIDDLEWARE: Customer Session Authentication (Cookie/Bearer)
// =========================================================
// Dual-mode: reads session from HttpOnly cookie first,
// falls back to Authorization Bearer header for backward compat.
// Validates session against DB (not just JWT signature).
// =========================================================

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { COOKIE_NAME, getClearCookieOptions } = require('../config/cookie');
const { hashToken } = require('../utils/helpers');
const { db } = require('../database');

function verifyCustomerSession(req, res, next) {
    let token = req.cookies[COOKIE_NAME];

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

        const session = db.prepare(`
            SELECT * FROM customer_sessions WHERE id = ?
        `).get(decoded.session_id);

        if (!session) throw new Error('Session revoked');

        if (new Date() > new Date(session.expires_at)) {
            db.prepare(`DELETE FROM customer_sessions WHERE id = ?`)
                .run(decoded.session_id);
            throw new Error('Session expired');
        }

        if (hashToken(token) !== session.token_hash) {
            throw new Error('Token mismatch');
        }

        req.customer = {
            email: session.email,
            session_id: session.id
        };

        next();

    } catch (e) {
        res.clearCookie(COOKIE_NAME, getClearCookieOptions());
        return res.sendStatus(403);
    }
}

module.exports = { verifyCustomerSession };
