const mongoose = require('mongoose');

const AvailabilitySchema = new mongoose.Schema({
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan',
    required: true
  },
  day: { type: String, required: true }, // e.g., "Monday"
  start_time: { type: String, required: true }, // e.g., "09:00 AM"
  end_time: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Availability', AvailabilitySchema);