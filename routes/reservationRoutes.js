const express = require('express');
const router = express.Router();
const Reservation = require('../models/ReservationModel');
const Notification = require('../models/NotificationModel'); // Make sure this import is here!
const { protectCustomer, protectArtisan } = require('../middleware/authMiddleware');

// =======================================================
// 1. CREATE A RESERVATION (Customer)
// =======================================================
router.post('/', protectCustomer, async (req, res) => {
  try {
    const { artisanId, description, start_date, total_price } = req.body;

    // Create the Reservation
    const reservation = await Reservation.create({
      customer: req.customer._id,
      artisan: artisanId,
      description,
      start_date,
      total_price
    });

    // Create the Notification for the Artisan
    try {
      await Notification.create({
        recipient: artisanId,
        sender: req.customer._id,
        onModel: 'Artisan', // The person receiving this is an Artisan
        message: `New booking request from ${req.customer.name}`,
        type: 'booking'
      });
    } catch (notifErr) {
      console.error("Notification failed to save:", notifErr.message);
      // We don't return res.status(500) here because the booking itself succeeded
    }

    res.status(201).json(reservation);
  } catch (error) {
    console.error("RESERVATION ERROR:", error); // Check your VS Code terminal for this!
    res.status(500).json({ message: 'Booking failed', error: error.message });
  }
});

// =======================================================
// 2. GET CUSTOMER ORDERS
// =======================================================
router.get('/my-requests', protectCustomer, async (req, res) => {
  try {
    const orders = await Reservation.find({ customer: req.customer._id })
      .populate('artisan', 'name craftType location profilePicture')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your requests' });
  }
});

// =======================================================
// 3. GET ARTISAN JOBS
// =======================================================
router.get('/incoming-jobs', protectArtisan, async (req, res) => {
  try {
    const jobs = await Reservation.find({ artisan: req.artisan._id })
      .populate('customer', 'name phone_number profilePicture')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching incoming jobs' });
  }
});

// =======================================================
// 4. UPDATE STATUS (Artisan)
// =======================================================
router.put('/:id/status', protectArtisan, async (req, res) => {
  try {
    const { status } = req.body;
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    reservation.status = status;
    await reservation.save();

    // Notify the Customer about the status change
    await Notification.create({
      recipient: reservation.customer,
      sender: req.artisan._id,
      onModel: 'Customer', // The person receiving this is a Customer
      message: `Your booking status is now: ${status}`,
      type: 'status_update'
    });

    res.json(reservation);
  } catch (error) {
    res.status(500).json({ message: 'Status update failed' });
  }
});

module.exports = router;