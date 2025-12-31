// models/ArtisanModel.js
const mongoose = require('mongoose');

const ArtisanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, 
    lowercase: true,
    
  },
  phone_number: { 
    type: String
   },
  password: { 
    type: String,
    required: true,
  },
  craftType: {
    type: String,
  required: true, 
  enum: ['Tailoring', 'Carpentry', 'Embroidery', 'Pottery', 'Blacksmith', 'Painter', 'Other'],
  },
  location: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  
  profilePicture: {
  type: String,
  default: '/uploads/default-avatar.png' // Optional: a default image
},
  portfolioImages: [
    {
      type: String,
    },
  ],
  averageRating: {
    type: Number,
    default: 0,
  }
  
}, {
  timestamps: true,
});

module.exports = mongoose.model('Artisan', ArtisanSchema);