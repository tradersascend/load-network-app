const express = require('express');
const router = express.Router();
const { calculateDeadhead, getZipCodesInRadius } = require('../controllers/mapsController');
const { protect } = require('../middleware/authMiddleware');

// This route is protected, only logged-in users can use the calculator
router.post('/calculate-deadhead', protect, calculateDeadhead);

// Route to get ZIP codes within a radius
router.post('/zip-codes-in-radius', protect, getZipCodesInRadius);

module.exports = router;