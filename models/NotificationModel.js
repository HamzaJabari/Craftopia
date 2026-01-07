const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    refPath: 'onModelRecipient' // Dynamic reference
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    refPath: 'onModelSender' // Dynamic reference
  },
  onModelRecipient: { 
    type: String, 
    required: true, 
    enum: ['Artisan', 'Customer', 'Admin'] 
  },
  onModelSender: { 
    type: String, 
    required: true, 
    enum: ['Artisan', 'Customer', 'Admin'] 
  },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['booking', 'status_update', 'review', 'system_alert', 'comment'], 
    required: true 
  },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);