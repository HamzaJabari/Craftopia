const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // Who receives the alert (can be Customer, Artisan, or Admin) [cite: 554]
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientModel' // Dynamic reference
  },
  recipientModel: {
    type: String,
    required: true,
    enum: ['Customer', 'Artisan', 'Admin']
  },
  message: { type: String, required: true }, // [cite: 554]
  type: { type: String, required: true }, // e.g., 'Booking', 'Review', 'General' [cite: 554]
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);