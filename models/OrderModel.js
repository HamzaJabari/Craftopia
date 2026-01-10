const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', required: true },
    
    // NEW: Distinguish between 'portfolio_order' and 'custom_request'
    type: { 
      type: String, 
      enum: ['portfolio_order', 'custom_request'], 
      default: 'portfolio_order' 
    },

    // OPTIONAL: Only for Portfolio Orders
    projectId: { type: mongoose.Schema.Types.ObjectId, required: false }, // No longer required
    
    // REQUIRED for BOTH (but logic differs)
    title: { type: String, required: true }, // "Oak Table" OR "Custom Request: Dragon"
    image: { type: String }, // Portfolio cover OR Customer uploaded reference
    
    // DETAILS
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 }, // Custom orders might have price 0 initially
    totalPrice: { type: Number, default: 0 },
    
    status: {
      type: String,
      enum: ['pending', 'accepted', 'completed', 'cancelled'],
      default: 'pending',
    },
    note: { type: String } // Customer's requirements
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);