const express = require('express');
const router = express.Router();
const Reservation = require('../models/ReservationModel');
const Notification = require('../models/NotificationModel'); // For automated alerts
const { protectCustomer, protectArtisan } = require('../middleware/authMiddleware');

// =======================================================
// 1. CREATE A RESERVATION (Table 11 & 12)
// Method: POST /api/reservations
// =======================================================
router.post('/', protectCustomer, async (req, res) => {
  try {
    const { artisan, description, start_date, total_price } = req.body;

    const reservation = new Reservation({
      customer: req.customer._id,
      artisan,
      description,
      start_date,
      status: 'New', 
      total_price
    });

    const savedReservation = await reservation.save();

    // 🔔 NOTIFICATION: Alert the Artisan of a new request (Table 22)
    await Notification.create({
      recipient: artisan,
      recipientModel: 'Artisan',
      message: `New booking request from ${req.customer.name}: ${description}`,
      type: 'Booking'
    });

    res.status(201).json(savedReservation);
  } catch (error) {
    res.status(500).json({ message: 'Error creating reservation' });
  }
});

// =======================================================
// 2. VIEW MY BOOKINGS (Table 19)
// Method: GET /api/reservations/artisan
// =======================================================
router.get('/artisan', protectArtisan, async (req, res) => {
  try {
    const bookings = await Reservation.find({ artisan: req.artisan._id })
      .populate('customer', 'name email')
      .sort({ start_date: 1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

// =======================================================
// 3. RESPOND TO REQUEST (Table 20)
// Method: PUT /api/reservations/:id/status
// =======================================================
router.put('/:id/status', protectArtisan, async (req, res) => {
  try {
    const { status, total_price } = req.body;
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    if (reservation.artisan.toString() !== req.artisan._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    reservation.status = status || reservation.status;
    if (total_price) reservation.total_price = total_price;

    const updatedReservation = await reservation.save();

    // 🔔 NOTIFICATION: Alert the Customer of the status update (Table 16)
    await Notification.create({
      recipient: updatedReservation.customer,
      recipientModel: 'Customer',
      message: `Your booking status has been updated to: ${status}`,
      type: 'Booking'
    });

    res.json(updatedReservation);
  } catch (error) {
    res.status(500).json({ message: 'Error updating reservation' });
  }
});

module.exports = router;