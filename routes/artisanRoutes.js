const sendEmail = require('../utils/sendEmail');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // REQUIRED for password reset
const Artisan = require('../models/ArtisanModel');
const { protectArtisan } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Your file uploader
const Order = require('../models/OrderModel');
const Review = require('../models/ReviewModel');


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
// =======================================================
// 4. UPLOAD PORTFOLIO (Image + Optional Video)
// Endpoint: POST /api/artisans/upload-portfolio
// =======================================================
// =======================================================
// ADD PROJECT (Gallery: Multiple Photos/Videos)
// Endpoint: POST /api/artisans/portfolio
// =======================================================
// =======================================================
// ADD PROJECT (With Auto-Cover Photo)
// Endpoint: POST /api/artisans/portfolio
// =======================================================
router.post(
  '/portfolio', 
  protectArtisan, 
  upload.array('files', 10), 
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Please upload at least one file.' });
      }

      const { title, description, price, isForSale } = req.body;
      let coverImage = ""; // Start empty

      // 1. Process files
      const mediaFiles = req.files.map((file, index) => {
        const cleanPath = `/${file.path.replace(/\\/g, "/")}`;
        const type = file.mimetype.startsWith('video') ? 'video' : 'image';

        // LOGIC: If we haven't found a cover image yet, and this is an image, grab it!
        if (coverImage === "" && type === 'image') {
          coverImage = cleanPath;
        }

        return { url: cleanPath, type: type };
      });

      // Fallback: If they only uploaded videos, use a default placeholder or the video thumbnail
      if (coverImage === "") {
        coverImage = "/uploads/default-cover.png"; // Or handle this how you prefer
      }

      const newProject = {
        title: title || 'Untitled Project',
        description: description || '',
        isForSale: isForSale === 'true',
        price: price || 0,
        coverImage: coverImage, // <--- SAVED HERE
        media: mediaFiles
      };

      const artisan = req.artisan;
      artisan.portfolio.push(newProject);
      await artisan.save();

      res.json({ 
        message: 'Project added successfully', 
        portfolio: artisan.portfolio 
      });

    } catch (error) {
      console.error("PORTFOLIO ERROR:", error);
      res.status(500).json({ message: 'Server Error' });
    }
  }
);
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
// =======================================================
// DELETE PROJECT
// Endpoint: DELETE /api/artisans/portfolio/:projectId
// =======================================================
router.delete('/portfolio/:projectId', protectArtisan, async (req, res) => {
  try {
    const artisan = req.artisan;
    const projectId = req.params.projectId;

    // Filter out the project with the matching ID
    const initialLength = artisan.portfolio.length;
    artisan.portfolio = artisan.portfolio.filter(
      (item) => item._id.toString() !== projectId
    );

    // Check if anything was actually deleted
    if (artisan.portfolio.length === initialLength) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await artisan.save();
    res.json({ message: 'Project deleted successfully', portfolio: artisan.portfolio });

  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
// ... (your existing delete route is here) ...

// =======================================================
// GET SINGLE PROJECT (By ID) <--- ADD THIS NEW PART
// Endpoint: GET /api/artisans/project/:projectId
// =======================================================
router.get('/project/:projectId', async (req, res) => {
  try {
    const artisan = await Artisan.findOne(
      { 'portfolio._id': req.params.projectId },
      { 'name': 1, 'email': 1, 'phone': 1, 'location': 1, 'avatar': 1, 'portfolio.$': 1 } 
    );

    if (!artisan || artisan.portfolio.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const project = artisan.portfolio[0];

    res.json({
      artisan: {
        _id: artisan._id,
        name: artisan.name,
        location: artisan.location,
        avatar: artisan.avatar,
        phone: artisan.phone
      },
      project: project
    });

  } catch (error) {
    console.error("GET PROJECT ERROR:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});
router.get('/my-portfolio', protectArtisan, async (req, res) => {
  try {
    // req.artisan is already loaded by the middleware
    // We just send back the 'portfolio' array
    res.json(req.artisan.portfolio);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
const Order = require('../models/OrderModel'); // Make sure this is imported at the top
const Review = require('../models/ReviewModel'); // Make sure this is imported at the top

router.get('/dashboard/stats', protectArtisan, async (req, res) => {
  try {
    const artisanId = req.artisan._id;

    // 1. Get Total Orders Count
    const totalOrders = await Order.countDocuments({ artisan: artisanId });

    // 2. Get Pending Orders Count
    const pendingOrders = await Order.countDocuments({ 
      artisan: artisanId, 
      status: 'pending' 
    });

    // 3. Get Completed Orders Count
    const completedOrders = await Order.countDocuments({ 
      artisan: artisanId, 
      status: 'completed' 
    });

    // 4. Get Reviews Stats (Count & Average)
    const reviewStats = await Review.aggregate([
      { $match: { artisan: artisanId } },
      { 
        $group: { 
          _id: null, 
          count: { $sum: 1 }, 
          avgRating: { $avg: "$stars_number" } 
        } 
      }
    ]);

    res.json({
      totalOrders,
      pendingOrders,
      completedOrders,
      totalReviews: reviewStats[0]?.count || 0,
      averageRating: reviewStats[0]?.avgRating?.toFixed(1) || 0
    });

  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});
// =======================================================
// GET DASHBOARD STATS (For the Cards)
// Endpoint: GET /api/artisans/dashboard/stats
// =======================================================
const Order = require('../models/OrderModel'); // Make sure this is imported at the top
const Review = require('../models/ReviewModel'); // Make sure this is imported at the top

router.get('/dashboard/stats', protectArtisan, async (req, res) => {
  try {
    const artisanId = req.artisan._id;

    // 1. Get Total Orders Count
    const totalOrders = await Order.countDocuments({ artisan: artisanId });

    // 2. Get Pending Orders Count
    const pendingOrders = await Order.countDocuments({ 
      artisan: artisanId, 
      status: 'pending' 
    });

    // 3. Get Completed Orders Count
    const completedOrders = await Order.countDocuments({ 
      artisan: artisanId, 
      status: 'completed' 
    });

    // 4. Get Reviews Stats (Count & Average)
    const reviewStats = await Review.aggregate([
      { $match: { artisan: artisanId } },
      { 
        $group: { 
          _id: null, 
          count: { $sum: 1 }, 
          avgRating: { $avg: "$stars_number" } 
        } 
      }
    ]);

    res.json({
      totalOrders,
      pendingOrders,
      completedOrders,
      totalReviews: reviewStats[0]?.count || 0,
      averageRating: reviewStats[0]?.avgRating?.toFixed(1) || 0
    });

  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});
module.exports = router;