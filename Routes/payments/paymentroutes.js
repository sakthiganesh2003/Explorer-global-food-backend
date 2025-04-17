const express = require('express');
const {
  createPaymentMethod,
  createRazorpayOrder,
  verifyPayment,
  recordManualPayment,
  processRefund,
  getPaymentsByBooking
} = require('../../Controller/payment/paymentcontroller.js');

const router = express.Router();

// Payment methods
router.post('/methods', createPaymentMethod);

// Razorpay payments
router.post('/razorpay/create-order', createRazorpayOrder);
router.post('/razorpay/verify', verifyPayment);

// Manual payments
router.post('/manual', recordManualPayment);

// Refunds
router.post('/refunds', processRefund);

// Get payments
router.get('/booking/:bookingId', getPaymentsByBooking);

module.exports = router;