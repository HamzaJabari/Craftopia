const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/AdminModel');
const Artisan = require('../models/ArtisanModel');
const Customer = require('../models/CustomerModel');
const Review = require('../models/ReviewModel');
const Reservation = require('../models/ReservationModel'); // For stats
const Notification = require('../models/NotificationModel'); // For broadcast
const { protectAdmin } = require('../middleware/authMiddleware');

// =======================================================
// 1. AUTH: CREATE ADMIN
// Endpoint: POST /api/admin/create
// =======================================================
router.post('/create', async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;
    if (secretKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const adminExists = await Admin.findOne({ email });
    if (adminExists) return res.status(400).json({ message: 'Admin exists' });

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
      res.status(401).json({ message: 'Invalid credentials' });
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
    // Run all counts in parallel for speed
    const [customerCount, artisanCount, reviewCount, reservationCount] = await Promise.all([
      Customer.countDocuments(),
      Artisan.countDocuments(),
      Review.countDocuments(),
      Reservation.countDocuments()
    ]);

    res.json({
      customers: customerCount,
      artisans: artisanCount,
      reviews: reviewCount,
      reservations: reservationCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

// =======================================================
// 4. USERS: GET ALL USERS (Artisans + Customers)
// Endpoint: GET /api/admin/users
// =======================================================
router.get('/users', protectAdmin, async (req, res) => {
  try {
    const artisans = await Artisan.find().select('-password');
    const customers = await Customer.find().select('-password');
    
    // Return them in one object
    res.json({
      artisans,
      customers
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// =======================================================
// 5. USERS: DELETE USER
// Endpoint: DELETE /api/admin/users/:id?role=artisan
// Note: You must pass ?role=artisan or ?role=customer in URL
// =======================================================
router.delete('/users/:id', protectAdmin, async (req, res) => {
  try {
    // CHANGED: We now get 'role' from the Body (req.body), not the URL (req.query)
    const { role } = req.body; 
    const { id } = req.params;

    if (role === 'artisan') {
      await Artisan.findByIdAndDelete(id);
    } else if (role === 'customer') {
      await Customer.findByIdAndDelete(id);
    } else {
      // If they forgot the role or typed it wrong
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
// Body: { "message": "...", "target": "all" }
// =======================================================
router.post('/broadcast', protectAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    
    // 1. Get ALL users (Artisans + Customers)
    const artisans = await Artisan.find().select('_id');
    const customers = await Customer.find().select('_id');

    const allNotifications = [];

    // 2. Prepare Artisan Notifications
    artisans.forEach(u => {
      allNotifications.push({
        recipient: u._id,
        sender: req.admin._id, // From Admin
        onModelRecipient: 'Artisan',
        onModelSender: 'Admin', // Ensure 'Admin' is in enum in NotificationModel
        message: `SYSTEM ALERT: ${message}`,
        type: 'system_alert'
      });
    });

    // 3. Prepare Customer Notifications
    customers.forEach(u => {
      allNotifications.push({
        recipient: u._id,
        sender: req.admin._id,
        onModelRecipient: 'Customer',
        onModelSender: 'Admin',
        message: `SYSTEM ALERT: ${message}`,
        type: 'system_alert'
      });
    });

    // 4. Bulk Insert (Much faster than loop save)
    await Notification.insertMany(allNotifications);

    res.json({ message: `Broadcast sent to ${allNotifications.length} users.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Broadcast failed' });
  }
});

// =======================================================
// 9. MODERATION: DELETE PORTFOLIO IMAGE
// Endpoint: DELETE /api/admin/portfolio
// Body: { "artisanId": "...", "imageUrl": "..." }
// =======================================================
router.delete('/portfolio', protectAdmin, async (req, res) => {
  try {
    const { artisanId, imageUrl } = req.body;
    const artisan = await Artisan.findById(artisanId);
    
    // Filter out the image
    artisan.portfolioImages = artisan.portfolioImages.filter(
      item => item.imageUrl !== imageUrl
    );

    await artisan.save();
    res.json({ message: 'Content removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Content deletion failed' });
  }
});

// Helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

module.exports = router;