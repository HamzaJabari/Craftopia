const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/AdminModel'); // You need this model (Step 2)
const Artisan = require('../models/ArtisanModel');
const Customer = require('../models/CustomerModel');
const Review = require('../models/ReviewModel');
const { protectAdmin } = require('../middleware/authMiddleware');

// =======================================================
// 1. CREATE ADMIN (One-time setup or Master Admin only)
// Endpoint: POST /api/admin/create
// =======================================================
router.post('/create', async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;

    // Security check: Prevent random people from creating admins
    // You should use a hardcoded secret in your .env file
    if (secretKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(401).json({ message: 'Not authorized to create admins' });
    }

    const adminExists = await Admin.findOne({ email });
    if (adminExists) return res.status(400).json({ message: 'Admin already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword
    });

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
// 2. ADMIN LOGIN
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
        role: 'admin' // Useful for frontend
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// =======================================================
// 3. DELETE REVIEW (Moderation)
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
// 4. DELETE PORTFOLIO CONTENT (Moderation)
// Endpoint: DELETE /api/admin/portfolio
// Body: { "artisanId": "...", "imageUrl": "..." }
// =======================================================
router.delete('/portfolio', protectAdmin, async (req, res) => {
  try {
    const { artisanId, imageUrl } = req.body;
    const artisan = await Artisan.findById(artisanId);
    
    // Remove the specific image from the array
    artisan.portfolioImages = artisan.portfolioImages.filter(
      item => item.imageUrl !== imageUrl
    );

    await artisan.save();
    res.json({ message: 'Content removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Deletion failed' });
  }
});

// Helper: Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

module.exports = router;