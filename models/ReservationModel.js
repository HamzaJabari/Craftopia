const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
  // Link to the Customer who made the booking [cite: 549]
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Customer', 
  },

  // Link to the Artisan providing the service [cite: 549]
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Artisan',
  },

  // Description/Details of the request [cite: 552]
  description: {
    type: String,
    required: true,
  },

  // Date and Time fields from your document 
  start_date: {
    type: Date,
    required: true,
  },
  
  // Note: end_date is useful for multi-day projects [cite: 549]
  end_date: {
    type: Date,
  },

  // Status as defined in your project requirements 
  status: {
    type: String,
    required: true,
    enum: ['New', 'Pending', 'Accepted', 'Rejected', 'Completed'],
    default: 'New',
  },

  // Total price for the service [cite: 549]
  total_price: {
    type: Number,
    default: 0,
  }

}, {
  timestamps: true,
});

module.exports = mongoose.model('Reservation', ReservationSchema);