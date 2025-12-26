const jwt = require('jsonwebtoken');
const Artisan = require('../models/ArtisanModel');
const Customer = require('../models/CustomerModel');

// Protects routes for Artisans
const protectArtisan = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.artisan = await Artisan.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized as artisan' });
    }
  }
  if (!token) res.status(401).json({ message: 'No token found' });
};

// Protects routes for Customers (New!)
const protectCustomer = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.customer = await Customer.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized as customer' });
    }
  }
  if (!token) res.status(401).json({ message: 'No token found' });
};

module.exports = { protectArtisan, protectCustomer };