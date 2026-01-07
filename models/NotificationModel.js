// models/NotificationModel.js
const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    refPath: 'onModelRecipient' // Changed this to distinguish recipient type
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    refPath: 'onModelSender' // Changed this to distinguish sender type
  },
  // We need two separate "onModel" fields because sender and recipient might be different types
  onModelRecipient: { 
    type: String, 
    required: true, 
    enum: ['Artisan', 'Customer'] 
  },
  onModelSender: { 
    type: String, 
    required: true, 
    enum: ['Artisan', 'Customer', 'Admin'] // <--- ADDED 'Admin'
  },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['booking', 'status_update', 'review', 'system_alert', 'comment'], // <--- ADDED 'system_alert' and 'comment'
    required: true 
  },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);