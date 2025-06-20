const express = require('express');
const router = express.Router();
const {
    getAlerts,
    createAlert,
    deleteAlert,
} = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

// All alert routes are protected and require a user to be logged in
router.route('/')
    .get(protect, getAlerts)
    .post(protect, createAlert);

router.route('/:id')
    .delete(protect, deleteAlert);

module.exports = router;