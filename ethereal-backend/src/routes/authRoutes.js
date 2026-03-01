// =========================================================
// ROUTES: Auth — magic link, session start, session logout
// =========================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { magicLinkLimiter } = require('../middleware/rateLimiters');
const { validate } = require('../validation/validate');
const { magicLinkSchema } = require('../validation/schemas');

router.post('/api/magic-link', magicLinkLimiter, validate(magicLinkSchema), authController.sendMagicLink);
router.get('/api/session/start', authController.startSession);
router.post('/api/session/logout', authController.logout);

module.exports = router;
