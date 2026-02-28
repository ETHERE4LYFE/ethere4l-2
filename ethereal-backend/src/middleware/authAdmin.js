// =========================================================
// MIDDLEWARE: Admin JWT Authentication (Bearer token)
// =========================================================

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        jwt.verify(bearerToken, JWT_SECRET, (err, authData) => {
            if (err) return res.sendStatus(403);
            req.authData = authData;
            next();
        });
    } else {
        res.sendStatus(401);
    }
}

module.exports = { verifyToken };
