const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  // The customer who wrote the review (Table 35)
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  // The artisan being reviewed (Table 35)
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan',
    required: true
  },
  // Number of stars 1-5 (Table 35)
  stars_number: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  // Text comment (Table 35)
  comment: {
    type: String,
    required: true
  },
  // Date of review (Table 35)
  review_date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Review', ReviewSchema);