const sendEmail = require('../utils/sendEmail');
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
// =======================================================
// 6. FORGOT PASSWORD (REAL EMAIL VERSION)
// =======================================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const artisan = await Artisan.findOne({ email });

    if (!artisan) {
      return res.status(404).json({ message: 'Email not found' });
    }

    // 1. Generate a 6-digit OTP (e.g., "492810")
    // Math.random() gives 0.xxxxx. * 900000 + 100000 ensures it's always 6 digits.
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Hash the OTP before saving (Security Best Practice)
    // We do this so even database admins can't see the codes.
    artisan.resetPasswordToken = crypto.createHash('sha256').update(otp).digest('hex');
    
    // 3. Set Expiration (10 Minutes)
    artisan.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await artisan.save();

    // 4. Send the Email with the PLAIN OTP
    const message = `Your Password Reset Code (OTP) is: \n\n ${otp} \n\nThis code expires in 10 minutes.`;

    try {
      await sendEmail({
        email: artisan.email,
        subject: 'Craftopia Password Reset Code',
        message,
      });

      res.status(200).json({ message: 'OTP sent to email' });

    } catch (emailError) {
      artisan.resetPasswordToken = undefined;
      artisan.resetPasswordExpire = undefined;
      await artisan.save();
      return res.status(500).json({ message: 'Email could not be sent' });
    }

  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// 7. RESET PASSWORD (Using Token)
// Endpoint: PUT /api/artisans/reset-password/:resetToken
// =======================================================
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // 1. Hash the incoming OTP to match what is in the DB
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // 2. Find user by Email AND matching OTP AND not expired
    const artisan = await Artisan.findOne({
      email,
      resetPasswordToken: hashedOtp,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!artisan) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // 3. Set new password
    const salt = await bcrypt.genSalt(10);
    artisan.password = await bcrypt.hash(newPassword, salt);

    // 4. Clear reset fields
    artisan.resetPasswordToken = undefined;
    artisan.resetPasswordExpire = undefined;

    await artisan.save();

    res.json({ message: 'Password reset successful' });

  } catch (error) {
    console.error("RESET ERROR:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Helper Function
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};
router.get('/', async (req, res) => {
  try {
    // .find() gets everyone
    // .select('-password') ensures we DON'T send their passwords
    // .select('-resetPasswordToken') hides security tokens
    const artisans = await Artisan.find()
      .select('-password -resetPasswordToken -resetPasswordExpire');
      
    res.json(artisans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching artisans' });
  }
});
router.get('/', async (req, res) => {
  try {
    const { craftType, location } = req.query;
    let query = {};

    // If user sent ?craftType=Wood, add it to the search
    if (craftType) {
      query.craftType = craftType;
    }

    // If user sent ?location=Hebron, add it to the search
    if (location) {
      query.location = location;
    }

    const artisans = await Artisan.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpire');
      
    res.json(artisans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching artisans' });
  }
});
router.put('/profile', protectArtisan, async (req, res) => {
  try {
    const artisan = await Artisan.findById(req.artisan._id);

    if (artisan) {
      // Update fields if they are sent in the body
      // If req.body.name exists, use it. Otherwise, keep old name.
      artisan.name = req.body.name || artisan.name;
      artisan.phone = req.body.phone || artisan.phone; // Note: 'phone' for Artisan
      artisan.location = req.body.location || artisan.location;
      artisan.craftType = req.body.craftType || artisan.craftType;
      artisan.description = req.body.description || artisan.description;

      const updatedArtisan = await artisan.save();

      res.json({
        _id: updatedArtisan._id,
        name: updatedArtisan.name,
        email: updatedArtisan.email,
        phone: updatedArtisan.phone,
        role: 'artisan',
        token: generateToken(updatedArtisan._id) // Optional: Return token again if you want
      });
    } else {
      res.status(404).json({ message: 'Artisan not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
router.put('/avatar', protectArtisan, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    // Convert path to URL format (fixes Windows backslashes)
    const imagePath = `/${req.file.path.replace(/\\/g, "/")}`;

    const artisan = await Artisan.findById(req.artisan._id);
    artisan.avatar = imagePath;
    await artisan.save();

    res.json({ 
      message: 'Avatar updated successfully', 
      avatar: artisan.avatar 
    });

  } catch (error) {
    console.error("AVATAR UPLOAD ERROR:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});
module.exports = router;