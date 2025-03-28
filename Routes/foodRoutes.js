const express = require('express');
const router = express.Router();
const {
  getCuisines,
  getFoodsByCuisine,
  createOrder,
  getMaidOrders
} = require('../Controller/foodController');

// Get all available cuisines
router.get('/cuisines', getCuisines);

// Get foods by cuisine
router.get('/cuisines/:cuisine', getFoodsByCuisine);

// Create new order
router.post('/orders', createOrder);

// Get orders for a maid
router.get('/maids/:maidId/orders', getMaidOrders);

module.exports = router;