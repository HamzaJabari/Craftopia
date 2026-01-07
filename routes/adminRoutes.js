const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// Import All Models
const Admin = require('../models/AdminModel');
const Customer = require('../models/CustomerModel');
const Artisan = require('../models/ArtisanModel');
const Reservation = require('../models/ReservationModel');
const Notification = require('../models/NotificationModel');
const Review = require('../models/ReviewModel');

// Import Utilities & Middleware
const generateToken = require('../utils/generateToken');
const { protectAdmin } = require('../middleware/authMiddleware');

// =======================================================
// 1. CREATE ADMIN (Setup Only)
// Endpoint: POST /api/admin/create
// =======================================================



router.post('/create', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      message: 'Admin created successfully',
      email: admin.email
    });
  } catch (error) {
    console.error("ADMIN CREATE ERROR:", error);
    res.status(500).json({ message: 'Failed to create admin', error: error.message });
  }
});

// =======================================================
// 2. ADMIN LOGIN
// Endpoint: POST /api/admin/login
// =======================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

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
// 3. SYSTEM STATISTICS
// Endpoint: GET /api/admin/stats
// =======================================================
router.get('/stats', protectAdmin, async (req, res) => {
  try {
    const [customerCount, artisanCount, reservationCount, completedReservations] = await Promise.all([
      Customer.countDocuments(),
      Artisan.countDocuments(),
      Reservation.countDocuments(),
      Reservation.find({ status: 'Completed' })
    ]);

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
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

// =======================================================
// 4. GET ALL USERS
// Endpoint: GET /api/admin/users
// =======================================================
router.get('/users', protectAdmin, async (req, res) => {
  try {
    const customers = await Customer.find({}).select('-password');
    const artisans = await Artisan.find({}).select('-password');

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
// =======================================================
router.delete('/users/:id', protectAdmin, async (req, res) => {
  try {
    const { role } = req.body; // Must send { "role": "customer" } or "artisan"

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

// =======================================================
// 6. BROADCAST NOTIFICATION (NEW)
// Endpoint: POST /api/admin/broadcast
// =======================================================
router.post('/broadcast', protectAdmin, async (req, res) => {
  try {
    const { message, target } = req.body;
    let recipients = [];

    // Find targets based on request
    if (target === 'customers' || target === 'all') {
      const customers = await Customer.find().select('_id');
      recipients.push(...customers.map(c => ({ id: c._id, role: 'Customer' })));
    }
    if (target === 'artisans' || target === 'all') {
      const artisans = await Artisan.find().select('_id');
      recipients.push(...artisans.map(a => ({ id: a._id, role: 'Artisan' })));
    }

    if (recipients.length === 0) {
      return res.status(400).json({ message: 'No recipients found' });
    }

    // Prepare notifications array
    const notifications = recipients.map(user => ({
      recipient: user.id,
      sender: req.admin._id,
      onModelRecipient: user.role,
      onModelSender: 'Admin', // Make sure NotificationModel supports 'Admin' enum
      message: `📢 SYSTEM UPDATE: ${message}`,
      type: 'system_alert'
    }));

    await Notification.insertMany(notifications);

    res.json({ message: `Notification sent to ${recipients.length} users.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Broadcast failed' });
  }
});

// =======================================================
// 7. GET ALL REVIEWS (Moderation - NEW)
// Endpoint: GET /api/admin/reviews
// =======================================================
router.get('/reviews', protectAdmin, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('customer', 'name email')
      .populate('artisan', 'name craftType')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// =======================================================
// 8. DELETE REVIEW (Moderation - NEW)
// Endpoint: DELETE /api/admin/reviews/:id
// =======================================================
router.delete('/reviews/:id', protectAdmin, async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted by Admin' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
});

// =======================================================
// 9. DELETE ARTISAN CONTENT (Moderation - NEW)
// Endpoint: DELETE /api/admin/portfolio
// =======================================================
router.delete('/portfolio', protectAdmin, async (req, res) => {
  try {
    const { artisanId, imageUrl } = req.body;
    
    const artisan = await Artisan.findById(artisanId);
    if (!artisan) return res.status(404).json({ message: 'Artisan not found' });

    // Remove the image from the array
    const originalLength = artisan.portfolioImages.length;
    artisan.portfolioImages = artisan.portfolioImages.filter(img => img !== imageUrl);

    if (artisan.portfolioImages.length === originalLength) {
      return res.status(404).json({ message: 'Image not found in portfolio' });
    }

    await artisan.save();
    res.json({ message: 'Content removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Content deletion failed' });
  }
});

module.exports = router;