const Food = require('../Models/Food');
const Order = require('../Models/Order');

// Get all available cuisines
exports.getCuisines = async (req, res) => {
  try {
    const cuisines = await Food.distinct('cuisine');
    res.json(cuisines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get foods by cuisine
exports.getFoodsByCuisine = async (req, res) => {
  try {
    const { cuisine } = req.params;
    const foods = await Food.find({ cuisine, isAvailable: true });
    res.json(foods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const { maidId, items, customerNotes } = req.body;
    
    // Calculate total price
    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Create order
    const order = await Order.create({
      maidId,
      items,
      totalPrice,
      customerNotes,
      status: 'pending'
    });
    
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get orders for a maid
exports.getMaidOrders = async (req, res) => {
  try {
    const { maidId } = req.params;
    const orders = await Order.find({ maidId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};