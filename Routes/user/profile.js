const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile } = require('../../Controller/user/profile');
const { protect } = require('../../middleware/authMiddleware'); // Uncomment if using auth

// User profile routes
router.route('/profile/user/:id')
  .get(protect, getUserProfile) // Fetch user profile (add protect if needed)
  .put(protect, updateUserProfile); // Update user profile (add protect if needed)

module.exports = router;