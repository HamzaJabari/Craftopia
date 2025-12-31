const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  phone_number: { 
    type: String 
  },
  profilePicture: {
  type: String,
  default: '/uploads/default-avatar.png' // Optional: a default image
},
  register_date: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('Customer', CustomerSchema);