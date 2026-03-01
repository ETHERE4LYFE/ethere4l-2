// =========================================================
// ROUTES: Webhook — must be mounted BEFORE express.json()
// =========================================================

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { webhookReplayGuard } = require('../middleware/webhookReplayGuard');

// Raw body parsing for Stripe signature verification + replay protection
router.post('/api/webhook', express.raw({ type: 'application/json' }), webhookReplayGuard, webhookController.handleWebhook);

module.exports = router;
