// =========================================================
// CONTROLLER: Auth — magic link, session start, session logout
// =========================================================

const authService = require('../services/auth/authService');
const emailService = require('../services/email/emailService');
const customerService = require('../services/customers/customerService');
const { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, getSessionCookieOptions, getClearCookieOptions } = require('../config/cookie');
const { CUSTOMER_SESSION_DAYS } = require('../config/constants');
const { FRONTEND_URL } = require('../config/env');
const { logger } = require('../utils/logger');
const { reportLoginFailure } = require('../middleware/adaptiveAbuse');

async function sendMagicLink(req, res) {
    try {
        const { email } = req.validatedBody;
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
        const { accessToken, refreshToken } = await authService.createCustomerSession(decoded.email, req.headers['user-agent'] || '', req.ip);

        // Access token (15 minutes) - maxAge passed in days, so we override for access token specifically
        const accessOptions = { ...getSessionCookieOptions(CUSTOMER_SESSION_DAYS), maxAge: 15 * 60 * 1000 };
        res.cookie(ACCESS_COOKIE_NAME, accessToken, accessOptions);

        // Refresh token (7 days)
        res.cookie(REFRESH_COOKIE_NAME, refreshToken, getSessionCookieOptions(CUSTOMER_SESSION_DAYS));

        logger.info('SESSION_STARTED_COOKIE', { email: decoded.email });

        res.json({ success: true, email: decoded.email });

    } catch (e) {
        logger.warn('SESSION_START_FAILED', { error: e.message });
        await reportLoginFailure(req);
        res.sendStatus(403);
    }
}

async function refreshSession(req, res) {
    const refreshToken = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token provided' });

    try {
        const { accessToken, refreshToken: newRefreshToken } = await authService.refreshSession(refreshToken, req.headers['user-agent'] || '', req.ip);

        // Set new cookies
        const accessOptions = { ...getSessionCookieOptions(CUSTOMER_SESSION_DAYS), maxAge: 15 * 60 * 1000 };
        res.cookie(ACCESS_COOKIE_NAME, accessToken, accessOptions);
        res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getSessionCookieOptions(CUSTOMER_SESSION_DAYS));

        res.json({ success: true });
    } catch (e) {
        logger.warn('REFRESH_FAILED', { error: e.message });
        res.clearCookie(ACCESS_COOKIE_NAME, getClearCookieOptions());
        res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
        res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
}

async function logout(req, res) {
    const refreshToken = req.cookies ? req.cookies[REFRESH_COOKIE_NAME] : null;
    if (refreshToken) {
        await authService.revokeSession(refreshToken);
    }

    res.clearCookie(ACCESS_COOKIE_NAME, getClearCookieOptions());
    res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
    res.json({ success: true });
}

module.exports = { sendMagicLink, startSession, refreshSession, logout };
