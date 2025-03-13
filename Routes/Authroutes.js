const express = require('express');
const router = express.Router();
const { signup, login,  forgotPassword, verifyResetCode, resetPassword, verifyEmail } = require('../Controller/Authcontroller');
router.post('/signup', signup);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

module.exports = router;