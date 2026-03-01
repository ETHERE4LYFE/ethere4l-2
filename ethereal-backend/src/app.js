// =========================================================
// APP.JS — Express Application (no server.listen)
// =========================================================
// Exports the fully configured Express app.
// server.js imports this and starts the HTTP server.
// Test files can import this directly without starting a server.
// =========================================================

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// =========================================================
// CONFIGURATION
// =========================================================
const { corsOptions } = require('./config/cors');

// =========================================================
// DATABASE (triggers schema init + catalog load on import)
// =========================================================
require('./database');

// =========================================================
// MIDDLEWARE IMPORTS
// =========================================================
const { securityHeaders } = require('./middleware/security');
const { requestLogger } = require('./middleware/requestLogger');
const { globalLimiter } = require('./middleware/rateLimiters');
const { corsErrorHandler, globalErrorHandler } = require('./middleware/errorHandler');

// =========================================================
// ROUTE IMPORTS
// =========================================================
const webhookRoutes = require('./routes/webhookRoutes');
const healthRoutes = require('./routes/healthRoutes');
const productRoutes = require('./routes/productRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');

// =========================================================
// BACKGROUND TASKS
// =========================================================
const inventoryService = require('./services/inventory/inventoryService');

// =========================================================
// APP INITIALIZATION
// =========================================================
const app = express();

// =========================================================
// MIDDLEWARE CHAIN — CORRECT ORDER
// =========================================================
//   1. Trust proxy
//   2. Security headers (Helmet)
//   3. CORS middleware
//   4. Vary header (CDN/proxy caching)
//   5. OPTIONS preflight
//   6. Webhook route (raw body, BEFORE express.json)
//   7. express.json({ limit }) + express.urlencoded({ limit })
//   8. cookieParser()
//   9. Global rate limiter
//   10. Request correlation / logging
//   11. Routes
//   12. Error handlers
// =========================================================

// 1. Trust proxy (Railway, Heroku, etc.)
app.set('trust proxy', 1);

// 2. Security headers (Helmet)
app.use(securityHeaders());

// 3. CORS
app.use(cors(corsOptions));

// 4. Vary header
app.use(function (req, res, next) {
    res.setHeader('Vary', 'Origin');
    next();
});

// 5. Preflight
app.options('*', cors(corsOptions));

// 6. Webhook route (BEFORE express.json — needs raw body)
app.use(webhookRoutes);

// 7. Body parsers with size limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// 8. Cookie parser
app.use(cookieParser());

// 9. Global rate limiter
app.use(globalLimiter);

// 10. Request correlation & logging
app.use(requestLogger);

// =========================================================
// 11. ROUTES
// =========================================================
app.use(healthRoutes);
app.use(productRoutes);
app.use(paymentRoutes);
app.use(orderRoutes);
app.use(adminRoutes);
app.use(authRoutes);

// =========================================================
// INVENTORY CLEANUP (background)
// =========================================================
setInterval(() => inventoryService.releaseStaleReservations(), 30 * 60 * 1000);
setTimeout(() => inventoryService.releaseStaleReservations(), 10000);

// =========================================================
// 12. ERROR HANDLERS
// =========================================================
app.use(corsErrorHandler);
app.use(globalErrorHandler);

module.exports = app;
