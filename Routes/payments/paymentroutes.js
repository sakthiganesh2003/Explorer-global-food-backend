const express = require('express');
const {
  initiatePayment,
  verifyPayment,
  getpaymenthistory,
  getAllPaymentHistory,
  getTotalEarnings
} = require('../../Controller/payment/paymentcontroller');

const router = express.Router();

// Initialize payment
router.post('/initiate', initiatePayment); // Line 10: Error here

// Verify payment (webhook or frontend callback)
router.post('/verify', verifyPayment);

router.get('/success/:id',   getpaymenthistory); // Assuming you have a function to get payment history

router.get('/allhistory/', getAllPaymentHistory)



module.exports = router;