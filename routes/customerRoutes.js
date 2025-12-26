const express = require('express');
const router = express.Router();
const Customer = require('../models/CustomerModel');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

// =======================================================
// 1. REGISTER NEW CUSTOMER
// Route: POST /api/customers
// =======================================================
router.post('/', async (req, res) => {
  try {
    const { name, email, password, phone_number } = req.body;

    // Validation matching Table 30 in your report [cite: 541]
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const customerExists = await Customer.findOne({ email });
    if (customerExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const customer = await Customer.create({
      name,
      email,
      password: hashedPassword,
      phone_number
    });

    res.status(201).json({
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      token: generateToken(customer._id),
      message: 'Customer registered successfully!'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// =======================================================
// 2. CUSTOMER LOGIN
// Route: POST /api/customers/login
// =======================================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const customer = await Customer.findOne({ email });

    if (customer && (await bcrypt.compare(password, customer.password))) {
      res.json({
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        token: generateToken(customer._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;