const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile } = require('../../Controller/user/userprofilecontroller'); // Adjust path to your controller
// const authMiddleware = require('../middleware/authMiddleware');

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

module.exports = router;
