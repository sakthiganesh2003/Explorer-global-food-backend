const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, createUserProfile } = require('../../Controller/user/profile');
const { protect } = require('../../middleware/authMiddleware'); // Uncomment if using auth
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Route for creating user profile
router.post('/', upload.single('image'), createUserProfile);
// User profile routes
router.route('/:id')
  .get(protect, getUserProfile) // Fetch user profile (add protect if needed)
  .put(protect, updateUserProfile); // Update user profile (add protect if needed)

module.exports = router;