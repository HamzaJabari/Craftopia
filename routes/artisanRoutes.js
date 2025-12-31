const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Artisan = require('../models/ArtisanModel');
const generateToken = require('../utils/generateToken');
const { protectArtisan } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// =======================================================
// 1. SIGNUP
// POST /api/artisans/signup
// =======================================================
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone_number, craftType, description, location } = req.body;

    const artisanExists = await Artisan.findOne({ email });
    if (artisanExists) {
      return res.status(400).json({ message: 'Artisan already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const artisan = await Artisan.create({
      name,
      email,
      password: hashedPassword,
      phone_number,
      craftType,
      description,
      location
    });

    if (artisan) {
      res.status(201).json({
        _id: artisan._id,
        name: artisan.name,
        email: artisan.email,
        phone_number: artisan.phone_number,
        craftType: artisan.craftType,
        location: artisan.location,
        role: 'artisan',
        token: generateToken(artisan._id)
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message || 'Signup failed' });
  }
});

// =======================================================
// 2. LOGIN
// POST /api/artisans/login
// =======================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const artisan = await Artisan.findOne({ email });

    if (artisan && (await bcrypt.compare(password, artisan.password))) {
      res.json({
        _id: artisan._id,
        name: artisan.name,
        role: 'artisan',
        token: generateToken(artisan._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// =======================================================
// 3. GET & UPDATE PROFILE
// GET/PUT /api/artisans/profile
// =======================================================
router.get('/profile', protectArtisan, async (req, res) => {
  try {
    const artisan = await Artisan.findById(req.artisan._id).select('-password');
    if (artisan) res.json(artisan);
    else res.status(404).json({ message: 'Artisan not found' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

router.put('/profile', protectArtisan, async (req, res) => {
  try {
    const artisan = await Artisan.findById(req.artisan._id);
    if (artisan) {
      artisan.name = req.body.name || artisan.name;
      artisan.phone_number = req.body.phone_number || artisan.phone_number;
      artisan.craftType = req.body.craftType || artisan.craftType;
      artisan.location = req.body.location || artisan.location;
      artisan.description = req.body.description || artisan.description;

      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        artisan.password = await bcrypt.hash(req.body.password, salt);
      }

      const updatedArtisan = await artisan.save();
      res.json(updatedArtisan);
    }
  } catch (error) {
    res.status(500).json({ message: 'Update failed' });
  }
});

// =======================================================
// 4. PORTFOLIO MANAGEMENT (Upload & Delete)
// =======================================================
router.post('/upload-portfolio', protectArtisan, upload.single('image'), async (req, res) => {
  try {
    const artisan = await Artisan.findById(req.artisan._id);
    if (!req.file) return res.status(400).json({ message: 'Please upload an image' });

    const imageUrl = `/uploads/${req.file.filename}`;
    artisan.portfolioImages.push(imageUrl);
    await artisan.save();
    
    res.json({ message: 'Image uploaded', imageUrl, portfolioImages: artisan.portfolioImages });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

router.delete('/delete-portfolio', protectArtisan, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const artisan = await Artisan.findById(req.artisan._id);

    artisan.portfolioImages = artisan.portfolioImages.filter(img => img !== imageUrl);
    await artisan.save();

    const filePath = path.join(__dirname, '..', imageUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: 'Image deleted', portfolioImages: artisan.portfolioImages });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed' });
  }
});

// =======================================================
// 5. SEARCH ARTISANS (Public)
// GET /api/artisans
// =======================================================
router.get('/', async (req, res) => {
  try {
    const { craftType, location } = req.query;
    let query = {};
    if (craftType) query.craftType = craftType;
    if (location) query.location = { $regex: location, $options: 'i' };

    const artisans = await Artisan.find(query).select('-password');
    res.json(artisans);
  } catch (error) {
    res.status(500).json({ message: 'Search failed' });
  }
});

module.exports = router;