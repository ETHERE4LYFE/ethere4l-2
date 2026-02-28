// =========================================================
// SHARED HELPERS
// =========================================================

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function parseSafeNumber(value, fallback = 0) {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (!value) return fallback;
    const cleanString = String(value).replace(/[^0-9.]/g, '');
    const number = parseFloat(cleanString);
    return isNaN(number) ? fallback : number;
}

function generateOrderToken(orderId, email) {
    return jwt.sign(
        { o: orderId, e: email },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const trimmed = email.trim();
    if (trimmed.length === 0 || trimmed.length > 254) return false;
    if (/\s/.test(trimmed)) return false;
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    return emailRegex.test(trimmed);
}

function getStatusDescription(status) {
    switch (status) {
        case 'CONFIRMADO': return 'Pago confirmado, preparando pedido';
        case 'EMPAQUETADO': return 'Pedido empaquetado';
        case 'EN_TRANSITO': return 'Pedido en camino';
        case 'ENTREGADO': return 'Pedido entregado';
        default: return '';
    }
}

module.exports = {
    parseSafeNumber,
    generateOrderToken,
    hashToken,
    validateEmail,
    getStatusDescription
};
