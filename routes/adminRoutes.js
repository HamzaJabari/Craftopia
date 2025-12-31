const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const upload = require('../middleware/uploadMiddleware');

// Models
const Admin = require('../models/AdminModel');
const Artisan = require('../models/ArtisanModel');
const Customer = require('../models/CustomerModel');

// =======================================================
// 1. ADMIN LOGIN (Table 23)
// Method: POST /api/admin/login
// =======================================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    
    if (admin && (await bcrypt.compare(password, admin.password))) {
      res.json({
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        token: generateToken(admin._id),
        isAdmin: true
      });
    } else {
      res.status(401).json({ message: 'Invalid admin credentials.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error during admin login.' });
  }
});

// =======================================================
// 2. GET SYSTEM STATS (Table 27)
// Method: GET /api/admin/stats
// =======================================================
router.get('/stats', async (req, res) => {
  try {
    const totalArtisans = await Artisan.countDocuments();
    const totalCustomers = await Customer.countDocuments();
    
    res.json({ 
      totalArtisans, 
      totalCustomers,
      platform: "Craftopia",
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics.' });
  }
});

// =======================================================
// 3. DELETE USER (Admin Action - Table 24)
// Method: DELETE /api/admin/user/:type/:id
// =======================================================
router.delete('/user/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    
    if (type === 'artisan') {
      await Artisan.findByIdAndDelete(id);
    } else if (type === 'customer') {
      await Customer.findByIdAndDelete(id);
    } else {
      return res.status(400).json({ message: 'Invalid user type. Use artisan or customer.' });
    }

    res.json({ message: `${type} account deleted successfully by Admin.` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user.' });
  }
});

module.exports = router;