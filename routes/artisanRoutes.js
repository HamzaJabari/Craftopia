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
// =======================================================
router.post('/signup', async (req, res) => {
  try {
    // 1. Use the EXACT names your teammate is sending
    const { name, email, password, phone_number, craftType, description, location } = req.body;

    const artisanExists = await Artisan.findOne({ email });
    if (artisanExists) {
      return res.status(400).json({ message: 'Artisan already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Create the Artisan
    // NOTE: We map 'phone_number' (frontend) to 'phone' (database) if needed, 
    // or just save it as is. 
    const artisan = await Artisan.create({
      name,
      email,
      password: hashedPassword,
      
      // FIX: Your DB might expect 'phone', but frontend sends 'phone_number'.
      // This line handles BOTH cases safely:
      phone: phone_number, 

      craftType,
      description,
      location,
      portfolioImages: [] // Initialize empty portfolio
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
// 3. PROFILE DATA (GET & PUT)
// =======================================================
router.get('/profile', protectArtisan, async (req, res) => {
  try {
    const artisan = await Artisan.findById(req.artisan._id).select('-password');
    res.json(artisan);
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
// 4. PROFILE PICTURE (Replaces main avatar)
// =======================================================
router.post('/profile-picture', protectArtisan, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const artisan = await Artisan.findById(req.artisan._id);
    
    // Delete old file if it exists (to save space)
    if (artisan.profilePicture && artisan.profilePicture.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', artisan.profilePicture);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    artisan.profilePicture = `/uploads/${req.file.filename}`;
    await artisan.save();

    res.json({ message: 'Profile picture updated', profilePicture: artisan.profilePicture });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

// =======================================================
// 5. PORTFOLIO IMAGES (Adds to array)
// =======================================================


router.post('/upload-portfolio', protectArtisan, upload.single('image'), async (req, res) => {
  try {
    // 1. Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    // 2. Get the Path (This is the URL we save!)
    // Windows uses backslashes (\), replace them with forward slashes (/) for URLs
    const imagePath = `/${req.file.path.replace(/\\/g, "/")}`;
    
    // 3. Get Price & Desc from Body
    const { price, description } = req.body;

    const artisan = req.artisan;

    // 4. Save to DB
    artisan.portfolioImages.push({
      imageUrl: imagePath,    // <--- The path generated by Multer
      price: price || 0,
      description: description || ''
    });

    await artisan.save();

    res.json({ 
      message: 'Image uploaded successfully', 
      portfolio: artisan.portfolioImages 
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ message: 'Upload failed' });
  }
});
// =======================================================
// 6. PUBLIC SEARCH
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