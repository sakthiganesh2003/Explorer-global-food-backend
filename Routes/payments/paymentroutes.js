const express = require('express');
const {
  initiatePayment,
  verifyPayment
} = require('../../Controller/payment/paymentcontroller');

const router = express.Router();

// Initialize payment
router.post('/initiate', initiatePayment); // Line 10: Error here

// Verify payment (webhook or frontend callback)
router.post('/verify', verifyPayment);

module.exports = router;