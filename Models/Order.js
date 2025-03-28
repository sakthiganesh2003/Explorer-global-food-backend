const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  foodId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Food', 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true 
  },
  quantity: { 
    type: Number, 
    default: 1 
  }
});

const orderSchema = new mongoose.Schema({
  maidId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  items: [orderItemSchema],
  totalPrice: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'],
    default: 'pending'
  },
  customerNotes: String
}, { 
  timestamps: true 
});

// Make sure this is the exact way you're exporting
const Order = mongoose.model('Order', orderSchema);
module.exports = Order;