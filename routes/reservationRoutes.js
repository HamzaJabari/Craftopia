const express = require('express');
const router = express.Router();
const Reservation = require('../models/ReservationModel');
const Notification = require('../models/NotificationModel');
const { protectCustomer, protectArtisan } = require('../middleware/authMiddleware');

// =======================================================
// 1. CREATE A RESERVATION (Customer)
// Method: POST /api/reservations
// =======================================================
router.post('/', protectCustomer, async (req, res) => {
  try {
    const { artisanId, description, start_date, total_price } = req.body;

    const reservation = await Reservation.create({
      customer: req.customer._id,
      artisan: artisanId,
      description,
      start_date,
      total_price
    });

    // TRIGGER NOTIFICATION for the Artisan
    await Notification.create({
      recipient: artisanId,
      sender: req.customer._id,
      message: `New booking request from ${req.customer.name} for ${start_date}`,
      type: 'booking'
    });

    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ message: 'Booking failed' });
  }
});

// =======================================================
// 2. GET CUSTOMER'S REQUESTS (My Orders)
// Method: GET /api/reservations/my-requests
// =======================================================
router.get('/my-requests', protectCustomer, async (req, res) => {
  try {
    const reservations = await Reservation.find({ customer: req.customer._id })
      .populate('artisan', 'name craftType phone_number')
      .sort({ createdAt: -1 });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

// =======================================================
// 3. GET ARTISAN'S INCOMING JOBS
// Method: GET /api/reservations/incoming-jobs
// =======================================================
router.get('/incoming-jobs', protectArtisan, async (req, res) => {
  try {
    const reservations = await Reservation.find({ artisan: req.artisan._id })
      .populate('customer', 'name phone_number')
      .sort({ createdAt: -1 });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching jobs' });
  }
});

// =======================================================
// 4. UPDATE RESERVATION STATUS (Artisan: Accept/Reject/Complete)
// Method: PUT /api/reservations/:id/status
// =======================================================
router.put('/:id/status', protectArtisan, async (req, res) => {
  try {
    const { status } = req.body; // e.g., 'Accepted', 'Rejected', 'Completed'
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    reservation.status = status;
    const updatedReservation = await reservation.save();

    // TRIGGER NOTIFICATION for the Customer
    await Notification.create({
      recipient: reservation.customer,
      sender: req.artisan._id,
      message: `Your booking status has been updated to: ${status}`,
      type: 'status_update'
    });

    res.json(updatedReservation);
  } catch (error) {
    res.status(500).json({ message: 'Update failed' });
  }
});

module.exports = router;