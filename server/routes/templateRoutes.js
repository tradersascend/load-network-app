const express = require('express');
const router = express.Router();
const {
    getTemplates,
    createTemplate,
    deleteTemplate,
    updateTemplate,
} = require('../controllers/templateController');
const { protect } = require('../middleware/authMiddleware');

// All template routes are protected and require a user to be logged in
router.route('/')
    .get(protect, getTemplates)
    .post(protect, createTemplate);

router.route('/:id')
    .delete(protect, deleteTemplate)
    .put(protect, updateTemplate);

module.exports = router;