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
router.get('/', healthController.getHealthLive);

// ---------------------------------------------------------
// Liveness Check Endpoint (Native Docker Healthcheck)
// ---------------------------------------------------------
router.get('/health/live', healthController.getHealthLive);

// ---------------------------------------------------------
// Readiness Check Endpoint (Load Balancers)
// ---------------------------------------------------------
router.get('/health/ready', healthController.getHealthReady);

// Used by strict uptime monitoring (UptimeRobot) with DB timeouts
router.get('/health/deep', healthController.getHealthDeep);

// ---------------------------------------------------------
// Metrics Endpoints
// ---------------------------------------------------------
// Lightweight operational metrics (uptime, memory, etc)
router.get('/metrics/basic', healthController.getMetrics);

// Full Prometheus metrics
// Example: GET http://localhost:4000/metrics
router.get('/metrics', healthController.getPrometheusMetrics);

module.exports = router;