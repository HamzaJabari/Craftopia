const express = require('express');
const router = express.Router();
const Customer = require('../models/CustomerModel');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const { protectCustomer } = require('../middleware/authMiddleware');

// 1. SIGNUP (Table 2/6)
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

// 2. LOGIN (Table 7)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
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
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// 3. GET CURRENT PROFILE (Table 2/8)
router.get('/profile', protectCustomer, async (req, res) => {
  const customer = await Customer.findById(req.customer._id).select('-password');
  if (customer) {
    res.json(customer);
  } else {
    res.status(404).json({ message: 'Customer not found' });
  }
});

module.exports = router;