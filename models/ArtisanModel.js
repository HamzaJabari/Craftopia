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
    avatar: { type: String, default: "" },
    role: {
      type: String,
      default: 'artisan', // Always 'artisan'
    },
    
    // =======================================================
    // NEW: RATING FIELDS (Added this part)
    // =======================================================
    rating: {
      type: Number,
      required: true,
      default: 0
    },
    numReviews: {
      type: Number,
      required: true,
      default: 0
    },
    // =======================================================

    // Portfolio Structure (Kept exactly as you had it)
    portfolio: [
      {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        isForSale: { type: Boolean, default: false },
        price: { type: Number, default: 0 },
        coverImage: { type: String, default: "" }, 
        media: [
          {
            url: { type: String, required: true },
            type: { type: String, enum: ['image', 'video'], required: true }
          }
        ],
        createdAt: { type: Date, default: Date.now }
      }
    ],

    // Reset Password Logic (Kept as you had it)
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Artisan', artisanSchema);