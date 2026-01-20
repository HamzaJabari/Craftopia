const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/AdminModel');
const Artisan = require('../models/ArtisanModel');
const Customer = require('../models/CustomerModel');
const Review = require('../models/ReviewModel');
const Order = require('../models/OrderModel'); // <--- CHANGED: Use Order, not Reservation
const Notification = require('../models/NotificationModel');
const { protectAdmin } = require('../middleware/authMiddleware');

// Helper to generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// =======================================================
// 1. AUTH: CREATE ADMIN (One-time setup)
// Endpoint: POST /api/admin/create
// =======================================================
router.post('/create', async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;
    
    // Simple security check
    if (secretKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(401).json({ message: 'Not authorized: Wrong Secret Key' });
    }

    const adminExists = await Admin.findOne({ email });
    if (adminExists) return res.status(400).json({ message: 'Admin already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const admin = await Admin.create({ name, email, password: hashedPassword });

    res.status(201).json({
      _id: admin.id,
      name: admin.name,
      email: admin.email,
      token: generateToken(admin.id)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating admin' });
  }
});

// =======================================================
// 2. AUTH: LOGIN
// Endpoint: POST /api/admin/login
// =======================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (admin && (await bcrypt.compare(password, admin.password))) {
      res.json({
        _id: admin.id,
        name: admin.name,
        email: admin.email,
        token: generateToken(admin.id),
        role: 'admin'
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// =======================================================
// 3. DASHBOARD: GET STATS
// Endpoint: GET /api/admin/stats
// =======================================================
router.get('/stats', protectAdmin, async (req, res) => {
  try {
    // CHANGED: Removed Reservation, Added Order
    const [customerCount, artisanCount, reviewCount, orderCount] = await Promise.all([
      Customer.countDocuments(),
      Artisan.countDocuments(),
      Review.countDocuments(),
      Order.countDocuments() 
    ]);

    res.json({
      customers: customerCount,
      artisans: artisanCount,
      reviews: reviewCount,
      orders: orderCount // Renamed from reservations to orders
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

// =======================================================
// 4. USERS: GET ALL USERS
// Endpoint: GET /api/admin/users
// =======================================================
router.get('/users', protectAdmin, async (req, res) => {
  try {
    const artisans = await Artisan.find().select('-password');
    const customers = await Customer.find().select('-password');
    res.json({ artisans, customers });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// =======================================================
// 5. USERS: DELETE USER
// Endpoint: DELETE /api/admin/users/:id
// Body: { "role": "artisan" } or { "role": "customer" }
// =======================================================
router.delete('/users/:id', protectAdmin, async (req, res) => {
  try {
    const { role } = req.body; 
    const { id } = req.params;

    if (role === 'artisan') {
      await Artisan.findByIdAndDelete(id);
      // Optional: Delete their orders too? For now, keep it simple.
    } else if (role === 'customer') {
      await Customer.findByIdAndDelete(id);
    } else {
      return res.status(400).json({ message: 'Please specify role: "artisan" or "customer" in the body.' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Deletion failed' });
  }
});

// =======================================================
// 6. MODERATION: GET ALL REVIEWS
// Endpoint: GET /api/admin/reviews
// =======================================================
router.get('/reviews', protectAdmin, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('customer', 'name email')
      .populate('artisan', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// =======================================================
// 7. MODERATION: DELETE REVIEW
// Endpoint: DELETE /api/admin/reviews/:id
// =======================================================
router.delete('/reviews/:id', protectAdmin, async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Deletion failed' });
  }
});

// =======================================================
// 8. SYSTEM: BROADCAST NOTIFICATION
// Endpoint: POST /api/admin/broadcast
// Body: { "message": "Server maintenance at midnight" }
// =======================================================
router.post('/broadcast', protectAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    
    // 1. Get IDs of everyone
    const artisans = await Artisan.find().select('_id');
    const customers = await Customer.find().select('_id');

    const allNotifications = [];

    // 2. Prepare Artisan Notifications
    artisans.forEach(u => {
      allNotifications.push({
        recipient: u._id,
        onModelRecipient: 'Artisan',
        sender: req.admin._id,
        onModelSender: 'Admin', // Ensure 'Admin' is in your NotificationModel Enum
        message: `SYSTEM ALERT: ${message}`,
        type: 'system_alert'
      });
    });

    // 3. Prepare Customer Notifications
    customers.forEach(u => {
      allNotifications.push({
        recipient: u._id,
        onModelRecipient: 'Customer',
        sender: req.admin._id,
        onModelSender: 'Admin',
        message: `SYSTEM ALERT: ${message}`,
        type: 'system_alert'
      });
    });

    // 4. Bulk Insert
    if (allNotifications.length > 0) {
      await Notification.insertMany(allNotifications);
    }

    res.json({ message: `Broadcast sent to ${allNotifications.length} users.` });
  } catch (error) {
    console.error("Broadcast Error:", error);
    res.status(500).json({ message: 'Broadcast failed' });
  }
});

// =======================================================
// 9. MODERATION: DELETE PORTFOLIO PROJECT
// Endpoint: DELETE /api/admin/project
// Body: { "artisanId": "...", "projectId": "..." }
// =======================================================
router.delete('/project', protectAdmin, async (req, res) => {
  try {
    const { artisanId, projectId } = req.body;
    
    const artisan = await Artisan.findById(artisanId);
    if (!artisan) return res.status(404).json({ message: 'Artisan not found' });

    // Remove the specific project from the portfolio array
    artisan.portfolio.pull({ _id: projectId });

    await artisan.save();
    res.json({ message: 'Project removed successfully' });
  } catch (error) {
    console.error("Delete Project Error:", error);
    res.status(500).json({ message: 'Content deletion failed' });
  }
});

module.exports = router;