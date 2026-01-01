const express = require('express');
const router = express.Router();
const Artisan = require('../models/ArtisanModel');
const Customer = require('../models/CustomerModel');
const Reservation = require('../models/ReservationModel');

// =======================================================
// 1. GET SYSTEM STATISTICS (Table 27 / Requirement 2.4.1)
// Method: GET /api/admin/stats
// =======================================================
router.get('/stats', async (req, res) => {
  try {
    const totalArtisans = await Artisan.countDocuments();
    const totalCustomers = await Customer.countDocuments();
    const totalReservations = await Reservation.countDocuments();

    // Calculate total platform revenue (sum of all reservation prices)
    const reservations = await Reservation.find();
    const totalRevenue = reservations.reduce((sum, res) => sum + (res.total_price || 0), 0);

    res.json({
      totalArtisans,
      totalCustomers,
      totalReservations,
      totalRevenue,
      platformStatus: "Active"
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching system statistics' });
  }
});

// =======================================================
// 2. GET ALL USERS (For Admin Management)
// Method: GET /api/admin/users
// =======================================================
router.get('/users', async (req, res) => {
  try {
    const artisans = await Artisan.find().select('-password');
    const customers = await Customer.find().select('-password');
    
    res.json({
      artisans,
      customers
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user lists' });
  }
});

// =======================================================
// 3. DELETE USER (Requirement 2.4.2)
// Method: DELETE /api/admin/user/:id
// =======================================================
router.delete('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.query; // Expecting ?role=artisan or ?role=customer

    if (role === 'artisan') {
      await Artisan.findByIdAndDelete(id);
    } else {
      await Customer.findByIdAndDelete(id);
    }

    res.json({ message: 'User deleted successfully from the platform' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

module.exports = router;