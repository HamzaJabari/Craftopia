const mongoose = require('mongoose');

const artisanSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String, 
      required: true 
    },
    craftType: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'artisan', // Always 'artisan'
    },
    
    // UPDATED: Portfolio now stores Price & Description
    portfolioImages: [
      {
        imageUrl: { type: String, required: true },
        price: { type: Number, default: 0 },
        description: { type: String, default: '' }
      }
    ],

    // NEW: For "Forgot Password" functionality
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Artisan', artisanSchema);