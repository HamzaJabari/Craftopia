const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    refPath: 'onModel' 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    refPath: 'onModel' 
  },
  // This tells Mongoose which collection to look at for the IDs
  onModel: { 
    type: String, 
    required: true, 
    enum: ['Artisan', 'Customer'] 
  },
  message: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['booking', 'status_update', 'review'],
    required: true 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);