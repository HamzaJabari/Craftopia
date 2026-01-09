const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // REQUIRED for password reset
const Artisan = require('../models/ArtisanModel');
const { protectArtisan } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Your file uploader

// =======================================================
// 1. SIGNUP
// Endpoint: POST /api/artisans/signup
// =======================================================
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone_number, craftType, description, location } = req.body;

    // Check if exists
    const artisanExists = await Artisan.findOne({ email });
    if (artisanExists) {
      return res.status(400).json({ message: 'Artisan already exists' });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create Artisan
    const artisan = await Artisan.create({
      name,
      email,
      password: hashedPassword,
      phone: phone_number, // Map frontend 'phone_number' to DB 'phone'
      craftType,
      description,
      location,
      portfolioImages: []
    });

    res.status(201).json({
      _id: artisan._id,
      name: artisan.name,
      role: 'artisan',
      token: generateToken(artisan._id)
    });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// =======================================================
// 2. LOGIN
// Endpoint: POST /api/artisans/login
// =======================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const artisan = await Artisan.findOne({ email });

    if (artisan && (await bcrypt.compare(password, artisan.password))) {
      res.json({
        _id: artisan.id,
        name: artisan.name,
        email: artisan.email,
        phone: artisan.phone,
        role: 'artisan',
        token: generateToken(artisan._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// 3. GET PROFILE
// Endpoint: GET /api/artisans/profile
// =======================================================
router.get('/profile', protectArtisan, async (req, res) => {
  res.json(req.artisan);
});

// =======================================================
// 4. UPLOAD PORTFOLIO (Image File + Price)
// Endpoint: POST /api/artisans/upload-portfolio
// =======================================================
router.post('/upload-portfolio', protectArtisan, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    // Convert Windows path to URL format if necessary
    const imagePath = `/${req.file.path.replace(/\\/g, "/")}`;
    const { price, description } = req.body;

    const artisan = req.artisan;

    artisan.portfolioImages.push({
      imageUrl: imagePath,
      price: price || 0,
      description: description || ''
    });

    await artisan.save();

    res.json({ 
      message: 'Portfolio updated successfully', 
      portfolio: artisan.portfolioImages 
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// =======================================================
// 5. CHANGE PASSWORD (Logged In)
// Endpoint: PUT /api/artisans/change-password
// =======================================================
// =======================================================
// 5. CHANGE PASSWORD (Fixed for Artisan)
// Endpoint: PUT /api/artisans/change-password
// =======================================================
router.put('/change-password', protectArtisan, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // FIX: Re-fetch the artisan using the ID from the token
    // so we get the password hash from the database.
    const artisan = await Artisan.findById(req.artisan._id);

    if (!artisan) {
        return res.status(404).json({ message: "Artisan not found" });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, artisan.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    artisan.password = await bcrypt.hash(newPassword, salt);

    await artisan.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});
// =======================================================
// 6. FORGOT PASSWORD (Logged Out)
// Endpoint: POST /api/artisans/forgot-password
// =======================================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const artisan = await Artisan.findOne({ email });

    if (!artisan) {
      return res.status(404).json({ message: 'Email not found' });
    }

    // Generate Token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash and save to DB
    artisan.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    artisan.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes

    await artisan.save();

    // In a real app, send email here. For now, return the link.
    const resetUrl = `http://localhost:5000/api/artisans/reset-password/${resetToken}`;
    
    res.json({ message: 'Reset link generated', resetUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// 7. RESET PASSWORD (Using Token)
// Endpoint: PUT /api/artisans/reset-password/:resetToken
// =======================================================
router.put('/reset-password/:resetToken', async (req, res) => {
  try {
    // Hash token from URL to match DB
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    const artisan = await Artisan.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!artisan) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    artisan.password = await bcrypt.hash(req.body.password, salt);

    // Clear reset fields
    artisan.resetPasswordToken = undefined;
    artisan.resetPasswordExpire = undefined;

    await artisan.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Helper Function
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

module.exports = router;