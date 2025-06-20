const express = require('express');
const router = express.Router();
const { createPortalSession, handleStripeWebhook } = require('../controllers/webhookController');
const { protect } = require('../middleware/authMiddleware');

// Route for receiving events from Stripe (public)
router.post('/webhook', express.raw({type: 'application/json'}), handleStripeWebhook);

// Route for a logged-in user to manage their billing (protected)
router.post('/create-portal-session', protect, createPortalSession);

module.exports = router;