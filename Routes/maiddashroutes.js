const express = require('express');
const router = express.Router();
const maiddashController = require('../Controller/maiddashController');
const auth = require('../middleware/auth'); // Make sure this path is correct

// @route   GET api/maid-dashboard/profile
// @desc    Get maid profile
// @access  Private
router.get('/profile', maiddashController.getMaidProfile);

router.post('/profile', maiddashController.getMaidProfile);


// @route   PUT api/maid-dashboard/profile
// @desc    Update maid profile
// @access  Private
router.put('/profile',  maiddashController.updateMaidProfile);

// @route   PUT api/maid-dashboard/toggle-status
// @desc    Toggle maid active status
// @access  Private
router.put('/toggle-status',  maiddashController.toggleActiveStatus);

module.exports = router;