// =========================================================
// HEALTH ROUTES
// =========================================================
// Purpose:
//   - Root status endpoint
//   - Health check for load balancers / Docker
//   - Metrics endpoint (basic operational metrics)
//
// Mounted in app.js with:
//   app.use('/', healthRoutes);
// =========================================================

const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// ---------------------------------------------------------
// Root Endpoint
// ---------------------------------------------------------
// Simple confirmation that API is alive
// Example: GET http://localhost:4000/
router.get('/', healthController.getRoot);

// ---------------------------------------------------------
// Health Check Endpoint
// ---------------------------------------------------------
// Used by:
//   - Docker healthcheck
//   - Railway / Render / Load balancers
//   - Uptime monitoring services
//
// Example: GET http://localhost:4000/health
router.get('/health', healthController.getHealth);

// ---------------------------------------------------------
// Metrics Endpoint
// ---------------------------------------------------------
// Lightweight operational metrics (uptime, memory, etc)
// NOT Prometheus full integration (yet)
//
// Example: GET http://localhost:4000/metrics
router.get('/metrics', healthController.getMetrics);

module.exports = router;