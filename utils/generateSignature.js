const crypto = require('crypto');

const orderId = 'order_QMPfN43yPYj9Oy';
const paymentId = 'pay_test_12345';
const keySecret = ''; // Replace with your actual key_secret from .env

const data = `${orderId}|${paymentId}`;
const signature = crypto
  .createHmac('sha256', keySecret)
  .update(data)
  .digest('hex');

console.log('Generated Signature:', signature)