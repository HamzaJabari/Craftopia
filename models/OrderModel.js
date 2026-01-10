const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artisan',
      required: true,
    },
    // We store the Project ID so we know exactly which item was ordered
    projectId: {
      type: mongoose.Schema.Types.ObjectId, 
      required: true 
    },
    // We accept a snapshot of the title/image in case the artisan deletes the project later
    projectTitle: { type: String, required: true },
    projectImage: { type: String }, 
    
    price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'completed', 'cancelled'],
      default: 'pending',
    },
    note: {
      type: String, // Optional note from customer (e.g., "Please wrap it in blue")
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);