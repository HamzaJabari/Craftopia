const express = require('express');
const router = express.Router();
const Artisan = require('../models/ArtisanModel'); 
const bcrypt = require('bcryptjs'); 
const generateToken = require('../utils/generateToken'); 
const { protectArtisan } = require('../middleware/authMiddleware'); // <-- NEW: Middleware for protecting routes


// =======================================================
// 1. REGISTER NEW ARTISAN (Create)
// Method: POST /api/artisans
// Access: Public
// =======================================================
router.post('/', async (req, res) => {
  try {
    const { name, email, password, craftType, location } = req.body;

    // 1. Basic Validation
    if (!name || !email || !password || !craftType || !location) {
      return res.status(400).json({ message: 'Please enter all required fields.' });
    }

    // 2. Check if the artisan already exists
    const artisanExists = await Artisan.findOne({ email });
    if (artisanExists) {
      return res.status(400).json({ message: 'Artisan with that email already exists.' });
    }

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create and save the new Artisan document
    const artisan = new Artisan({
      name,
      email,
      password: hashedPassword,
      craftType,
      location,
    });
    const createdArtisan = await artisan.save();
    
    // 5. Send success response back with token
    res.status(201).json({
      _id: createdArtisan._id,
      name: createdArtisan.name,
      email: createdArtisan.email,
      craftType: createdArtisan.craftType,
      location: createdArtisan.location,
      token: generateToken(createdArtisan._id), 
      message: 'Artisan registered successfully!'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});


// =======================================================
// 2. AUTHENTICATE ARTISAN (Login)
// Method: POST /api/artisans/login
// Access: Public
// =======================================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find the artisan by email
    const artisan = await Artisan.findOne({ email });

    // 2. Check if artisan exists AND password matches
    if (artisan && (await bcrypt.compare(password, artisan.password))) {
      
      // 3. Successful Login
      res.json({
        _id: artisan._id,
        name: artisan.name,
        email: artisan.email,
        craftType: artisan.craftType,
        token: generateToken(artisan._id),
      });
    } else {
      // 4. Failed Login
      res.status(401).json({ message: 'Invalid email or password.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});


// =======================================================
// 3. GET ALL ARTISANS (Read)
// Method: GET /api/artisans
// Access: Public
// =======================================================
router.get('/', async (req, res) => {
  try {
    // Select all artisans but exclude the password field
    const artisans = await Artisan.find({}).select('-password'); 
    res.json(artisans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// =======================================================
// 4. GET SINGLE ARTISAN (Read)
// Method: GET /api/artisans/:id
// Access: Public
// =======================================================
router.get('/:id', async (req, res) => {
  try {
    // Find artisan by ID and exclude the password field
    const artisan = await Artisan.findById(req.params.id).select('-password'); 

    if (artisan) {
      res.json(artisan);
    } else {
      res.status(404).json({ message: 'Artisan not found.' });
    }
  } catch (error) {
    res.status(404).json({ message: 'Invalid Artisan ID.' });
  }
});


// =======================================================
// 5. UPDATE ARTISAN PROFILE (Update)
// Method: PUT /api/artisans/profile
// Access: Private (Protected by the 'protect' middleware)
// =======================================================
router.put('/profile', protectArtisan, async (req, res) => {
  // req.artisan is attached by the 'protect' middleware, containing the logged-in artisan's data
  const artisan = req.artisan; 

  if (artisan) {
    // Update fields only if they are provided in the request body
    artisan.name = req.body.name || artisan.name;
    artisan.email = req.body.email || artisan.email;
    artisan.craftType = req.body.craftType || artisan.craftType;
    artisan.location = req.body.location || artisan.location;
    artisan.description = req.body.description || artisan.description;
    // Note: PortfolioImages update would involve file upload logic, but for simple text fields, this is sufficient.

    const updatedArtisan = await artisan.save();

    res.json({
      _id: updatedArtisan._id,
      name: updatedArtisan.name,
      email: updatedArtisan.email,
      craftType: updatedArtisan.craftType,
      location: updatedArtisan.location,
      description: updatedArtisan.description,
    });
  } else {
    // This case should be handled by the 'protect' middleware, but is included for safety
    res.status(404).json({ message: 'Artisan not found.' }); 
  }
});


module.exports = router;