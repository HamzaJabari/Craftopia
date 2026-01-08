const mongoose = require('mongoose');

const artisanSchema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  location: { type: String, required: true },
  craftType: { type: String, required: true }, // e.g., Carpenter, Potter
  description: { type: String },
  profilePicture: { type: String },
  
  // --- NEW STRUCTURE: Image + Price + Description ---
  portfolioImages: [
    {
      imageUrl: { type: String, required: true },
      price: { type: Number, default: 0 },       // <--- The Price Tag
      description: { type: String }              // <--- Optional details
    }
  ],
  // ------------------------------------------------

  rating: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Artisan', artisanSchema);