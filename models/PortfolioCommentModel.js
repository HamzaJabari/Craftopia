// models/PortfolioCommentModel.js
const mongoose = require('mongoose');

const PortfolioCommentSchema = new mongoose.Schema({
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  // We identify the image by its URL string
  imageUrl: {
    type: String,
    required: true
  },
  comment: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('PortfolioComment', PortfolioCommentSchema);