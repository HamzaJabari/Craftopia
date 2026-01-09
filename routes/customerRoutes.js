const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // REQUIRED for password reset
const Customer = require('../models/CustomerModel');
const { protectCustomer } = require('../middleware/authMiddleware');

// =======================================================
// 1. SIGNUP
// Endpoint: POST /api/customers/signup
// =======================================================
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone_number, location } = req.body;

    // Check if exists
    const customerExists = await Customer.findOne({ email });
    if (customerExists) {
      return res.status(400).json({ message: 'Customer already exists' });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create Customer
    const customer = await Customer.create({
      name,
      email,
      password: hashedPassword,
      phone_number, // Matches your Model exactly
      location
    });

    res.status(201).json({
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      role: 'customer',
      token: generateToken(customer._id)
    });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// 2. LOGIN
// Endpoint: POST /api/customers/login
// =======================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await Customer.findOne({ email });

    if (customer && (await bcrypt.compare(password, customer.password))) {
      res.json({
        _id: customer.id,
        name: customer.name,
        email: customer.email,
        phone_number: customer.phone_number,
        role: 'customer',
        token: generateToken(customer._id)
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
// Endpoint: GET /api/customers/profile
// =======================================================
router.get('/profile', protectCustomer, async (req, res) => {
  res.json(req.customer);
});

// =======================================================
// 4. CHANGE PASSWORD (Logged In)
// Endpoint: PUT /api/customers/change-password
// =======================================================
// =======================================================
// 4. CHANGE PASSWORD (Fixed)
// =======================================================
router.put('/change-password', protectCustomer, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // FIX: Re-fetch the customer using the ID from the token.
    // We do this to ensure we get the 'password' field from the DB.
    const customer = await Customer.findById(req.customer._id);

    if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, customer.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    customer.password = await bcrypt.hash(newPassword, salt);

    await customer.save();
    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// 5. FORGOT PASSWORD (Logged Out)
// Endpoint: POST /api/customers/forgot-password
// =======================================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const customer = await Customer.findOne({ email });

    if (!customer) {
      return res.status(404).json({ message: 'Email not found' });
    }

    // Generate Token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash and save to DB
    customer.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    customer.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes

    await customer.save();

    // Return the reset link
    const resetUrl = `http://localhost:5000/api/customers/reset-password/${resetToken}`;
    
    res.json({ message: 'Reset link generated', resetUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// 6. RESET PASSWORD (Using Token)
// Endpoint: PUT /api/customers/reset-password/:resetToken
// =======================================================
router.put('/reset-password/:resetToken', async (req, res) => {
  try {
    // Hash token from URL to match DB
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    const customer = await Customer.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!customer) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    customer.password = await bcrypt.hash(req.body.password, salt);

    // Clear reset fields
    customer.resetPasswordToken = undefined;
    customer.resetPasswordExpire = undefined;

    await customer.save();

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