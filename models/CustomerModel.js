const mongoose = require('mongoose');

const customerSchema = mongoose.Schema(
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
    // Your specific naming convention for customers
    phone_number: {
      type: String,
      required: true, 
    },
    location: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      default: 'customer', // Always 'customer'
    },

    // NEW: For "Forgot Password" functionality
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Customer', customerSchema);