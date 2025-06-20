const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { searchLoads } = require('../controllers/loadController');
const { placeBid } = require('../controllers/bidController');

// Route to search for loads
router.get('/search', protect, searchLoads);

// Route to place a bid on a specific load
router.post('/:id/bid', protect, placeBid);

module.exports = router;