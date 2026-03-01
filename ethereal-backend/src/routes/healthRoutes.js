// =========================================================
// ROUTES: Health — root, health check, metrics
// =========================================================

const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

router.get('/', healthController.getRoot);
router.get('/health', healthController.getHealth);
router.get('/metrics', healthController.getMetrics);

module.exports = router;
