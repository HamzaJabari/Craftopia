const express = require('express');
const router = express.Router();
const Reservation = require('../models/ReservationModel');
const Notification = require('../models/NotificationModel');
const { protectCustomer, protectArtisan } = require('../middleware/authMiddleware');

// =======================================================
// 1. CREATE RESERVATION (Customer Action)
// =======================================================
router.post('/', protectCustomer, async (req, res) => {
  try {
    const { artisan, description, start_date, total_price } = req.body;

    const reservation = await Reservation.create({
      customer: req.customer._id,
      artisan,
      description,
      start_date,
      total_price,
      status: 'New'
    });

    // Notify Artisan
    await Notification.create({
      recipient: artisan,
      recipientModel: 'Artisan',
      message: `You have a new booking request from ${req.customer.name}`,
      type: 'Booking'
    });

    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// =======================================================
// 2. GET CUSTOMER REQUESTS (With Status Filter)
// GET /api/reservations/my-requests?status=Accepted
// =======================================================
router.get('/my-requests', protectCustomer, async (req, res) => {
  try {
    const { status } = req.query;
    let query = { customer: req.customer._id };
    
    if (status) query.status = status;

    const reservations = await Reservation.find(query)
      .populate('artisan', 'name craftType location phone_number')
      .sort({ createdAt: -1 });

    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customer requests' });
  }
});

// =======================================================
// 3. GET ARTISAN JOBS (With Status Filter)
// GET /api/reservations/incoming-jobs?status=New
// =======================================================
router.get('/incoming-jobs', protectArtisan, async (req, res) => {
  try {
    const { status } = req.query;
    let query = { artisan: req.artisan._id };

    if (status) query.status = status;

    const reservations = await Reservation.find(query)
      .populate('customer', 'name phone_number email')
      .sort({ createdAt: -1 });

    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching artisan jobs' });
  }
});

// =======================================================
// 4. UPDATE STATUS (Artisan Action)
// =======================================================
router.put('/:id/status', protectArtisan, async (req, res) => {
  try {
    const { status } = req.body;
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) return res.status(404).json({ message: 'Not found' });

    reservation.status = status;
    await reservation.save();

    // Notify Customer of the change
    await Notification.create({
      recipient: reservation.customer,
      recipientModel: 'Customer',
      message: `Your booking status is now: ${status}`,
      type: 'Booking'
    });

    res.json(reservation);
  } catch (error) {
    res.status(500).json({ message: 'Update failed' });
  }
});

module.exports = router;