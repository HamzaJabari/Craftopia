const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Make sure you have this installed
const jwt = require('jsonwebtoken');

// Import All Models (Needed for Stats and User Management)
const Admin = require('../models/AdminModel');
const Customer = require('../models/CustomerModel');
const Artisan = require('../models/ArtisanModel');
const Reservation = require('../models/ReservationModel');

// Import Utilities
const generateToken = require('../utils/generateToken');
// Middleware (We will use this to protect the sensitive admin routes)
// Note: You need to make sure protectAdmin is exported from your authMiddleware
const { protectAdmin } = require('../middleware/authMiddleware');

// =======================================================
// 1. CREATE ADMIN (Run once via Postman to setup)
// Endpoint: POST /api/admin/create
// =======================================================
router.post('/create', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if admin already exists
    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the Admin
    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      message: 'Admin created successfully',
      _id: admin._id,
      email: admin.email
    });
  } catch (error) {
    // This logs the specific error to your terminal so you can see what happened
    console.error("ADMIN CREATE ERROR:", error);
    res.status(500).json({ message: 'Failed to create admin', error: error.message });
  }
});

// =======================================================
// 2. ADMIN LOGIN (The missing piece)
// Endpoint: POST /api/admin/login
// =======================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email });

    // Check password
    if (admin && (await bcrypt.compare(password, admin.password))) {
      res.json({
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
        token: generateToken(admin._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// =======================================================
// 3. SYSTEM STATISTICS (For Dashboard)
// Endpoint: GET /api/admin/stats
// =======================================================
router.get('/stats', async (req, res) => {
  try {
    // Run these queries in parallel for speed
    const [customerCount, artisanCount, reservationCount, completedReservations] = await Promise.all([
      Customer.countDocuments(),
      Artisan.countDocuments(),
      Reservation.countDocuments(),
      Reservation.find({ status: 'Completed' })
    ]);

    // Calculate Total Revenue (Sum of all completed jobs)
    const totalRevenue = completedReservations.reduce((acc, curr) => acc + (curr.total_price || 0), 0);

    res.json({
      totalUsers: customerCount + artisanCount,
      customers: customerCount,
      artisans: artisanCount,
      totalReservations: reservationCount,
      completedJobs: completedReservations.length,
      totalRevenue: totalRevenue
    });

  } catch (error) {
    console.error("STATS ERROR:", error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

// =======================================================
// 4. GET ALL USERS (Customers & Artisans)
// Endpoint: GET /api/admin/users
// =======================================================
router.get('/users', async (req, res) => {
  try {
    // Fetch both lists
    const customers = await Customer.find({}).select('-password');
    const artisans = await Artisan.find({}).select('-password');

    // Combine them and add a "role" label so Frontend knows who is who
    const allUsers = [
      ...customers.map(c => ({ ...c._doc, role: 'customer' })),
      ...artisans.map(a => ({ ...a._doc, role: 'artisan' }))
    ];

    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// =======================================================
// 5. DELETE USER
// Endpoint: DELETE /api/admin/users/:id
//Body: { "role": "customer" } OR { "role": "artisan" }
// =======================================================
router.delete('/users/:id', async (req, res) => {
  try {
    const { role } = req.body; // We need to know which collection to look in

    if (role === 'customer') {
      await Customer.findByIdAndDelete(req.params.id);
    } else if (role === 'artisan') {
      await Artisan.findByIdAndDelete(req.params.id);
    } else {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

module.exports = router;