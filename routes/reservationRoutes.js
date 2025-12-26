const express = require('express');
const router = express.Router();
const Reservation = require('../models/ReservationModel');
const { protectCustomer, protectArtisan } = require('../middleware/authMiddleware');

// =======================================================
// 1. CUSTOMER SENDS A REQUEST (Matches Table 11 & 12)
// Route: POST /api/reservations
// =======================================================
router.post('/', protectCustomer, async (req, res) => {
  try {
    const { artisan, description, start_date, total_price } = req.body;

    const reservation = new Reservation({
      customer: req.customer._id, // Taken from the token
      artisan,
      description,
      start_date,
      status: 'New', // Matches status in Table 34
      total_price
    });

    const savedReservation = await reservation.save();
    res.status(201).json(savedReservation);
  } catch (error) {
    res.status(500).json({ message: 'Error creating reservation' });
  }
});

// =======================================================
// 2. ARTISAN VIEWS THEIR REQUESTS (Matches Table 19)
// Route: GET /api/reservations/artisan
// =======================================================
router.get('/artisan', protectArtisan, async (req, res) => {
  try {
    // .populate('customer', 'name email') lets us see WHO booked [cite: 365]
    const bookings = await Reservation.find({ artisan: req.artisan._id })
      .populate('customer', 'name email');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

module.exports = router;