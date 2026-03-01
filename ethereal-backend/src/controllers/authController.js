// =========================================================
// CONTROLLER: Auth — magic link, session start, session logout
// =========================================================

const authService = require('../services/auth/authService');
const emailService = require('../services/email/emailService');
const customerService = require('../services/customers/customerService');
const { COOKIE_NAME, getSessionCookieOptions, getClearCookieOptions } = require('../config/cookie');
const { CUSTOMER_SESSION_DAYS } = require('../config/constants');
const { FRONTEND_URL } = require('../config/env');
const { logger } = require('../utils/logger');

async function sendMagicLink(req, res) {
    try {
        const { email } = req.body;
        const cleanEmail = String(email || '').trim().toLowerCase();

        if (!cleanEmail || !cleanEmail.includes('@')) {
            return res.json({ success: true });
        }

        if (await customerService.hasOrders(cleanEmail)) {
            const magicToken = authService.createMagicToken(cleanEmail);
            const link = `${FRONTEND_URL}/mis-pedidos.html?token=${magicToken}`;

            try {
                await emailService.sendMagicLinkEmail(cleanEmail, link);
            } catch (emailErr) {
                logger.error('MAGIC_LINK_EMAIL_FAILED', {
                    email: cleanEmail,
                    error: emailErr.message,
                    statusCode: emailErr.statusCode || 'N/A',
                    name: emailErr.name
                });
            }
        }

        res.json({ success: true });

    } catch (err) {
        logger.error('MAGIC_LINK_ERROR', { error: err.message, stack: err.stack });
        res.json({ success: true });
    }
}

async function startSession(req, res) {
    const { token } = req.query;
    if (!token) return res.sendStatus(400);

    try {
        const decoded = authService.verifyMagicToken(token);
        const customerToken = await authService.createCustomerSession(decoded.email, req.headers['user-agent'] || '', req.ip);

        res.cookie(COOKIE_NAME, customerToken, getSessionCookieOptions(CUSTOMER_SESSION_DAYS));
        logger.info('SESSION_STARTED_COOKIE', { email: decoded.email });

        res.json({ success: true, email: decoded.email });

    } catch (e) {
        logger.warn('SESSION_START_FAILED', { error: e.message });
        res.sendStatus(403);
    }
}

async function logout(req, res) {
    const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
    if (token) {
        await authService.revokeSession(token);
    }
    res.clearCookie(COOKIE_NAME, getClearCookieOptions());
    res.json({ success: true });
}

module.exports = { sendMagicLink, startSession, logout };
