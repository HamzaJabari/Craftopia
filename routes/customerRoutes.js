const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Customer = require('../models/CustomerModel');
const generateToken = require('../utils/generateToken');
const { protectCustomer } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Import Multer

// =======================================================
// 1. SIGNUP & LOGIN
// =======================================================
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone_number } = req.body;
    const customerExists = await Customer.findOne({ email });
    if (customerExists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const customer = await Customer.create({
      name, email, password: hashedPassword, phone_number
    });

    res.status(201).json({
      _id: customer._id,
      name: customer.name,
      role: 'customer',
      token: generateToken(customer._id)
    });
  } catch (error) {
    res.status(500).json({ message: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const customer = await Customer.findOne({ email });
  if (customer && (await bcrypt.compare(password, customer.password))) {
    res.json({
      _id: customer._id,
      name: customer.name,
      role: 'customer',
      token: generateToken(customer._id)
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
});

// =======================================================
// 2. PROFILE MANAGEMENT (Includes Profile Picture)
// =======================================================

// GET Profile
router.get('/profile', protectCustomer, async (req, res) => {
  const customer = await Customer.findById(req.customer._id).select('-password');
  res.json(customer);
});

// UPDATE Profile Text Data
router.put('/profile', protectCustomer, async (req, res) => {
  const customer = await Customer.findById(req.customer._id);
  if (customer) {
    customer.name = req.body.name || customer.name;
    customer.phone_number = req.body.phone_number || customer.phone_number;
    const updated = await customer.save();
    res.json(updated);
  }
});

// UPLOAD Profile Picture (The multipart/form-data endpoint)
router.post('/profile-picture', protectCustomer, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Please upload a file' });
    
    const customer = await Customer.findById(req.customer._id);
    customer.profilePicture = `/uploads/${req.file.filename}`;
    await customer.save();

    res.json({ 
      message: 'Picture updated', 
      profilePicture: customer.profilePicture 
    });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

module.exports = router;