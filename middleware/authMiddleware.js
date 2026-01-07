const jwt = require('jsonwebtoken');
const Artisan = require('../models/ArtisanModel');
const Customer = require('../models/CustomerModel');
const Admin = require('../models/AdminModel'); // <--- Make sure this is imported

// =======================================================
// 1. GENERIC PROTECT (Helper for internal use)
// =======================================================
const protect = async (req, res, next, role) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check based on role
      if (role === 'artisan') {
        req.artisan = await Artisan.findById(decoded.id).select('-password');
        if (!req.artisan) throw new Error('Not authorized');
      } 
      else if (role === 'customer') {
        req.customer = await Customer.findById(decoded.id).select('-password');
        if (!req.customer) throw new Error('Not authorized');
      }
      else if (role === 'admin') {
        req.admin = await Admin.findById(decoded.id).select('-password');
        if (!req.admin) throw new Error('Not authorized');
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// =======================================================
// 2. EXPORTED MIDDLEWARES
// =======================================================

const protectArtisan = (req, res, next) => protect(req, res, next, 'artisan');
const protectCustomer = (req, res, next) => protect(req, res, next, 'customer');

// THIS IS THE FUNCTION YOU WERE MISSING
const protectAdmin = (req, res, next) => protect(req, res, next, 'admin');

module.exports = { 
  protectArtisan, 
  protectCustomer, 
  protectAdmin 
};