const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artisan',
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId, 
      required: true 
    },
    projectTitle: { type: String, required: true },
    projectImage: { type: String }, 
    
    // NEW FIELDS
    quantity: { type: Number, default: 1 },       // How many?
    unitPrice: { type: Number, required: true },  // Price of 1 item
    totalPrice: { type: Number, required: true }, // unitPrice * quantity
    
    status: {
      type: String,
      enum: ['pending', 'accepted', 'completed', 'cancelled'],
      default: 'pending',
    },
    note: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);