// =========================================================
// SERVICE: Auth — Admin auth, customer sessions, token ops
// =========================================================
// No Express req/res. Pure business logic.
// =========================================================

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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
    // 1. Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        user = await prisma.user.create({ data: { email } });
    }

    // 2. Generate Tokens
    const accessToken = jwt.sign(
        { email, userId: user.id, role: user.role, scope: 'customer' },
        JWT_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const dtExpires = new Date();
    dtExpires.setDate(dtExpires.getDate() + CUSTOMER_SESSION_DAYS);

    // 3. Store new session
    const session = await prisma.session.create({
        data: {
            userId: user.id,
            refreshToken: hashedRefreshToken,
            userAgent: userAgent || '',
            ipAddress: ip || '',
            expiresAt: dtExpires
        }
    });

    return {
        accessToken,
        refreshToken,
        sessionId: session.id
    };
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

async function revokeSession(refreshTokenRaw) {
    try {
        if (!refreshTokenRaw) return false;
        const hashedToken = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');

        await prisma.session.update({
            where: { refreshToken: hashedToken },
            data: { isRevoked: true }
        });
        logger.info('SESSION_REVOKED', { tokenHash: hashedToken.substring(0, 8) });
        return true;
    } catch (e) {
        return false;
    }
}

async function refreshSession(refreshTokenRaw, userAgent, ip) {
    const hashedIncoming = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');

    const session = await prisma.session.findUnique({
        where: { refreshToken: hashedIncoming },
        include: { user: true }
    });

    // Validations
    if (!session) throw new Error('Invalid refresh token');

    if (session.isRevoked) {
        // Token Reuse Detected: Revoke ALL sessions for user
        await prisma.session.updateMany({
            where: { userId: session.userId },
            data: { isRevoked: true }
        });
        logger.warn('COMPROMISED_TOKEN_REUSE', { userId: session.userId });
        throw new Error('Compromised session detected');
    }

    if (new Date() > session.expiresAt) {
        await prisma.session.update({
            where: { id: session.id },
            data: { isRevoked: true }
        });
        throw new Error('Refresh token expired');
    }

    // Valid -> Rotate
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const newHashedToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    const newAccessToken = jwt.sign(
        { email: session.user.email, userId: session.userId, role: session.user.role, scope: 'customer' },
        JWT_SECRET,
        { expiresIn: '15m' }
    );

    const dtExpires = new Date();
    dtExpires.setDate(dtExpires.getDate() + CUSTOMER_SESSION_DAYS);

    // Revoke old, create new
    await prisma.$transaction([
        prisma.session.update({
            where: { id: session.id },
            data: { isRevoked: true }
        }),
        prisma.session.create({
            data: {
                userId: session.userId,
                refreshToken: newHashedToken,
                userAgent: userAgent || session.userAgent,
                ipAddress: ip || session.ipAddress,
                expiresAt: dtExpires
            }
        })
    ]);

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    };
}

module.exports = {
    validateAdmin,
    createCustomerSession,
    verifyMagicToken,
    createMagicToken,
    verifyOrderToken,
    revokeSession,
    refreshSession
};
