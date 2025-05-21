const express = require('express');
const router = express.Router();
const { getMaidProfile, updateMaidProfile, toggleActiveStatus } = require('../Controller/maiddashController');
const auth = require('../middleware/auth'); // Uncommented middleware

// @route   GET api/maid/profile/:userId
// @desc    Get maid profile
// @access  Private
router.get('/profile/:userId', auth, getMaidProfile);

// @route   PUT api/maid/profile
// @desc    Update maid profile
// @access  Private
router.put('/profile/:id', auth, updateMaidProfile);

// @route   PATCH api/maid/toggle-status
// @desc    Toggle maid active status
// @access  Private
router.patch('/toggle-status', auth, toggleActiveStatus);

module.exports = router;