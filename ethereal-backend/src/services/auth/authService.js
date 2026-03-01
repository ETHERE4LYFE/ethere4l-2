// =========================================================
// SERVICE: Auth — Admin auth, customer sessions, token ops
// =========================================================
// No Express req/res. Pure business logic.
// =========================================================

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { randomUUID: uuidv4 } = require('crypto');
const { JWT_SECRET } = require('../../config/env');
const { CUSTOMER_SESSION_DAYS } = require('../../config/constants');
const { hashToken } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');

// Now importing Prisma client instead of SQLite db
const prisma = require('../../database/prismaClient');

async function validateAdmin(password) {
    if (!process.env.ADMIN_PASS_HASH || !process.env.JWT_SECRET) {
        throw new Error('Server misconfigured: missing ADMIN_PASS_HASH or JWT_SECRET');
    }

    const cleanPassword = String(password || '').trim();
    const cleanHash = String(process.env.ADMIN_PASS_HASH).trim();
    const match = await bcrypt.compare(cleanPassword, cleanHash);

    if (!match) {
        return null;
    }

    const token = jwt.sign(
        { role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '4h' }
    );

    return token;
}

async function createCustomerSession(email, userAgent, ip) {
    const sessionId = uuidv4();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CUSTOMER_SESSION_DAYS);

    const payload = {
        email,
        session_id: sessionId,
        scope: 'customer'
    };

    const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: `${CUSTOMER_SESSION_DAYS}d`
    });

    await prisma.customerSession.create({
        data: {
            id: sessionId,
            email,
            tokenHash: hashToken(token),
            expiresAt,
            userAgent: userAgent || '',
            ip
        }
    });

    return token;
}

function verifyMagicToken(token) {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.scope !== 'read_orders') {
        throw new Error('Invalid scope');
    }
    return decoded;
}

function createMagicToken(email) {
    return jwt.sign(
        { email, scope: 'read_orders' },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

function verifyOrderToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

async function revokeSession(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.session_id) {
            await prisma.customerSession.deleteMany({
                where: { id: decoded.session_id }
            });
            logger.info('SESSION_REVOKED', { sessionId: decoded.session_id });
            return true;
        }
    } catch (e) {
        // Token might be expired/invalid — still clear the cookie
    }
    return false;
}

module.exports = {
    validateAdmin,
    createCustomerSession,
    verifyMagicToken,
    createMagicToken,
    verifyOrderToken,
    revokeSession
};
