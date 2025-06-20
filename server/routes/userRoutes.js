const express = require('express');
const router = express.Router();
const {
  createCheckoutSession,
  getOnboardingCompany,
  createAdminUser,
  verifyAccountId,
  loginUser,
  getMe,
  updateUserProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  recoverAccountId,
  createUserByAdmin,
  getCompanyUsers,
  deleteUserByAdmin,
  updateUserByAdmin,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// --- ONBOARDING ---
router.post('/register', createCheckoutSession);
router.get('/welcome/:token', getOnboardingCompany);
router.post('/complete-onboarding/:token', createAdminUser);

// --- Existing Login and Management Flow ---
router.post('/verify-account-id', verifyAccountId);
router.post('/login', loginUser);
router.post('/recover-account-id', recoverAccountId);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// --- Protected Routes ---
router.get('/me', protect, getMe);
router.put('/profile', protect, updateUserProfile);
router.put('/password', protect, changePassword);
router.post('/create-user', protect, createUserByAdmin);
router.get('/company-users', protect, getCompanyUsers);
router.delete('/manage-user/:userId', protect, deleteUserByAdmin);
router.put('/manage-user/:userId', protect, updateUserByAdmin);

module.exports = router;