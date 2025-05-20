// Routes/user/feedback.js
const express = require('express');
const router = express.Router();
const feedbackController = require('../../Controller/user/feedback');

router.post('/', feedbackController.createsFeedback);
// router.get('/:Id', feedbackController.getFeedback);
router.get('/allfeedback',feedbackController.getAllFeedbacks)

module.exports = router;