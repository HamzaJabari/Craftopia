const express = require('express');
const router = express.Router();
const Artisan = require('../models/ArtisanModel');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const { protectArtisan } = require('../middleware/authMiddleware');

// =======================================================
// 1. SIGNUP (Requirement 2.2.1 / Table 6)
// Method: POST /api/artisans/signup
// =======================================================
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone_number, craftType, description, location } = req.body;

    // Check if artisan already exists [cite: 279]
    const artisanExists = await Artisan.findOne({ email });
    if (artisanExists) {
      return res.status(400).json({ message: 'Artisan already exists with this email' });
    }

    // Hash the password for security 
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the artisan record [cite: 543, 544]
    const artisan = await Artisan.create({
      name,
      email,
      password: hashedPassword,
      phone_number,
      craftType, // Ensure this matches your model field
      description,
      location,
      register_date: new Date() // [cite: 541]
    });

    if (artisan) {
      res.status(201).json({
        _id: artisan._id,
        name: artisan.name,
        role: 'artisan', // Helps frontend handle redirection
        token: generateToken(artisan._id)
      });
    }
  } catch (error) {
    // Returning the specific error message to help you debug in Postman
    res.status(500).json({ message: error.message || 'Signup failed' });
  }
});

// =======================================================
// 2. LOGIN (Table 7)
// Method: POST /api/artisans/login
// =======================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find artisan by email [cite: 282]
    const artisan = await Artisan.findOne({ email });

    // Compare entered password with hashed password [cite: 282]
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
// 3. GET CURRENT PROFILE (Table 17 / Requirement 2.2.2)
// Method: GET /api/artisans/profile
// =======================================================
router.get('/profile', protectArtisan, async (req, res) => {
  try {
    // req.artisan is populated by the authMiddleware [cite: 197]
    const artisan = await Artisan.findById(req.artisan._id).select('-password');
    if (artisan) {
      res.json(artisan);
    } else {
      res.status(404).json({ message: 'Artisan not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// =======================================================
// 4. SEARCH & DISCOVERY (Requirement 2.2.3 / Table 9)
// Method: GET /api/artisans
// =======================================================
router.get('/', async (req, res) => {
  try {
    const { craftType, location } = req.query;
    let query = {};

    // Filter by craft type if provided (e.g., Carpentry) [cite: 149, 287]
    if (craftType) {
      query.craftType = craftType;
    }

    // Filter by location if provided [cite: 149, 287]
    if (location) {
      query.location = { $regex: location, $options: 'i' }; // Case-insensitive search
    }

    const artisans = await Artisan.find(query).select('-password');
    res.json(artisans);
  } catch (error) {
    res.status(500).json({ message: 'Error searching artisans' });
  }
});

module.exports = router;