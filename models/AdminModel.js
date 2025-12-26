const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  // Unique name for the system manager (Table 32)
  name: { 
    type: String, 
    required: true 
  },
  // Email used for admin login (Table 32)
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true 
  },
  // Encrypted password (Table 32)
  password: { 
    type: String, 
    required: true 
  }
}, { 
  // Automatically adds 'createdAt' and 'updatedAt' fields
  timestamps: true 
});

// Export the model
module.exports = mongoose.model('Admin', AdminSchema);