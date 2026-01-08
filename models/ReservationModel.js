const mongoose = require('mongoose');

const reservationSchema = mongoose.Schema({
  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  artisan: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Artisan', 
    required: true 
  },
  
  // NEW: Distinguish between buying vs asking
  job_type: { 
    type: String, 
    enum: ['Order', 'Custom_Request'], 
    required: true,
    default: 'Custom_Request'
  },

  // Description of work or item name
  title: { type: String, required: true }, 
  description: { type: String }, // Optional details

  // Status Workflow
  status: { 
    type: String, 
    enum: ['Pending', 'Price_Proposed', 'Negotiating', 'Accepted', 'In_Progress', 'Completed', 'Rejected'], 
    default: 'Pending' 
  },
  
  // Money & Time
  agreed_price: { type: Number, default: 0 }, 
  
  // *** HERE IS THE FIX: We use 'deadline', NOT 'start_date' ***
  deadline: { type: Date }, 

  // ONLY FOR "ORDER" (Buying from portfolio)
  quantity: { type: Number, default: 1 }, 
  reference_image: { type: String }, 

}, { timestamps: true });

module.exports = mongoose.model('Reservation', reservationSchema);