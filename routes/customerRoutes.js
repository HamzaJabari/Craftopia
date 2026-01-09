const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // <--- REQUIRED for OTP hashing
const Customer = require('../models/CustomerModel');
const { protectCustomer } = require('../middleware/authMiddleware');
const sendEmail = require('../utils/sendEmail'); // <--- REQUIRED for sending email
const upload = require('../middleware/uploadMiddleware');

// =======================================================
// 1. SIGNUP
// Endpoint: POST /api/customers/signup
// =======================================================
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone_number, location } = req.body;

    const customerExists = await Customer.findOne({ email });
    if (customerExists) {
      return res.status(400).json({ message: 'Customer already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const customer = await Customer.create({
      name,
      email,
      password: hashedPassword,
      phone_number,
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
  // Convert Mongoose document to a plain JavaScript object
  const customerObj = req.customer.toObject();

  // FORCE 'avatar' to exist. 
  // If customer has 'profilePicture' but no 'avatar', copy it over.
  if (!customerObj.avatar && customerObj.profilePicture) {
    customerObj.avatar = customerObj.profilePicture;
  }

  res.json(customerObj);
});
// =======================================================
// 4. CHANGE PASSWORD (Logged In)
// Endpoint: PUT /api/customers/change-password
// =======================================================
router.put('/change-password', protectCustomer, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    // Re-fetch customer to get the password hash
    const customer = await Customer.findById(req.customer._id);

    if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, customer.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

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
// 5. FORGOT PASSWORD (OTP VERSION)
// Endpoint: POST /api/customers/forgot-password
// =======================================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const customer = await Customer.findOne({ email });

    if (!customer) {
      return res.status(404).json({ message: 'Email not found' });
    }

    // 1. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Hash and Save
    customer.resetPasswordToken = crypto.createHash('sha256').update(otp).digest('hex');
    customer.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 Minutes

    await customer.save();

    // 3. Send Email
    const message = `Your Password Reset Code (OTP) is: \n\n ${otp} \n\nThis code expires in 10 minutes.`;

    try {
      await sendEmail({
        email: customer.email,
        subject: 'Craftopia Password Reset Code',
        message,
      });

      res.status(200).json({ message: 'OTP sent to email' });

    } catch (emailError) {
      customer.resetPasswordToken = undefined;
      customer.resetPasswordExpire = undefined;
      await customer.save();
      return res.status(500).json({ message: 'Email could not be sent' });
    }

  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// 6. RESET PASSWORD (VERIFY OTP)
// Endpoint: POST /api/customers/reset-password
// Body: { "email": "...", "otp": "...", "newPassword": "..." }
// =======================================================
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Hash the incoming OTP to compare
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const customer = await Customer.findOne({
      email,
      resetPasswordToken: hashedOtp,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!customer) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    customer.password = await bcrypt.hash(newPassword, salt);

    // Clear reset fields
    customer.resetPasswordToken = undefined;
    customer.resetPasswordExpire = undefined;

    await customer.save();

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
router.put('/profile', protectCustomer, async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);

    if (customer) {
      // Update fields if present
      customer.name = req.body.name || customer.name;
      customer.phone_number = req.body.phone_number || customer.phone_number; // Note: 'phone_number' for Customer
      customer.location = req.body.location || customer.location;

      const updatedCustomer = await customer.save();

      res.json({
        _id: updatedCustomer._id,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        phone_number: updatedCustomer.phone_number,
        role: 'customer',
        token: generateToken(updatedCustomer._id)
      });
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
router.put('/avatar', protectCustomer, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const imagePath = `/${req.file.path.replace(/\\/g, "/")}`;

    const customer = await Customer.findById(req.customer._id);
    
    // FIX: Update BOTH fields to keep Frontend happy
    customer.avatar = imagePath;
    customer.profilePicture = imagePath; 
    
    await customer.save();

    res.json({ 
      message: 'Avatar updated successfully', 
      avatar: customer.avatar,
      profilePicture: customer.profilePicture 
    });

  } catch (error) {
    console.error("AVATAR UPLOAD ERROR:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});
module.exports = router;