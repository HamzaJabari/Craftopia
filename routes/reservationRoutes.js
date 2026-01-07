const express = require('express');
const router = express.Router();
const Reservation = require('../models/ReservationModel');
const Notification = require('../models/NotificationModel');
const Artisan = require('../models/ArtisanModel'); // Added to check limits if needed
const { protectCustomer, protectArtisan } = require('../middleware/authMiddleware');

// =======================================================
// 1. CREATE RESERVATION (Customer)
// Endpoint: POST /api/reservations
// =======================================================
// =======================================================
// 1. CREATE RESERVATION (Customer)
// Endpoint: POST /api/reservations
// =======================================================
// =======================================================
// 1. CREATE RESERVATION (Customer)
// Endpoint: POST /api/reservations
// =======================================================
router.post('/', protectCustomer, async (req, res) => {
  try {
    // 1. Log the incoming data to see exactly what Postman is sending
    console.log("Incoming Request Body:", req.body); 

    const { artisanId, service_name, description, date, start_date, time } = req.body;

    // 2. SMART CHECK: Use 'start_date' if provided, otherwise use 'date'
    const finalDate = start_date || date; 

    // 3. Validation: If neither exists, stop here!
    if (!finalDate) {
      return res.status(400).json({ message: "Missing field: start_date (or date)" });
    }

    const reservation = await Reservation.create({
      customer: req.customer._id,
      artisan: artisanId,
      service_name,
      description,
      start_date: finalDate, // <--- Using the smart variable
      time,
      status: 'New'
    });

    // 4. Create Notification
    await Notification.create({
      recipient: artisanId,
      sender: req.customer._id,
      onModelRecipient: 'Artisan', 
      onModelSender: 'Customer',
      message: `New reservation request from ${req.customer.name}`,
      type: 'booking'
    });

    res.status(201).json(reservation);
  } catch (error) {
    console.error("RESERVATION ERROR:", error);
    res.status(500).json({ message: 'Reservation failed', error: error.message });
  }
});
// =======================================================
// 2. GET RESERVATIONS (For Authenticated User)
// Endpoint: GET /api/reservations
// =======================================================
router.get('/', async (req, res) => {
  // We need to manually check auth here since we serve both roles
  // Note: ideally use the 'protectAny' logic, but we'll do a quick check
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: 'Not authorized' });

  // This is a simplified handler. Ideally, use specific routes or middleware.
  // For now, let's assume if it's hitting this, we check the query params or user role manually
  // or rely on the frontend to hit specific role-based endpoints if you have them.
  
  // TO KEEP IT SIMPLE FOR YOUR PROJECT:
  // Let's assume you pass a role in query or we just fail if middleware isn't wrapped.
  // A better way is to split this into /customer and /artisan or use the protectAny we made.
  
  res.status(400).json({ message: "Please use /customer or /artisan specific endpoints if defined, or check middleware" });
});

// =======================================================
// 3. GET CUSTOMER RESERVATIONS
// Endpoint: GET /api/reservations/customer
// =======================================================
router.get('/customer', protectCustomer, async (req, res) => {
  try {
    const reservations = await Reservation.find({ customer: req.customer._id })
      .populate('artisan', 'name email phone location')
      .sort({ createdAt: -1 });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reservations' });
  }
});

// =======================================================
// 4. GET ARTISAN RESERVATIONS
// Endpoint: GET /api/reservations/artisan
// =======================================================
router.get('/artisan', protectArtisan, async (req, res) => {
  try {
    const reservations = await Reservation.find({ artisan: req.artisan._id })
      .populate('customer', 'name email phone location')
      .sort({ createdAt: -1 });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reservations' });
  }
});

// =======================================================
// 5. UPDATE RESERVATION STATUS (Artisan)
// Endpoint: PUT /api/reservations/:id/status
// =======================================================
router.put('/:id/status', protectArtisan, async (req, res) => {
  try {
    const { status, price } = req.body; // 'Accepted', 'Rejected', 'Completed'
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    // Update status
    reservation.status = status;
    
    // If completed, add price
    if (status === 'Completed' && price) {
      reservation.total_price = price;
    }

    await reservation.save();

    // --- FIX: Added onModelRecipient and onModelSender ---
    await Notification.create({
      recipient: reservation.customer, // Sending TO Customer
      sender: req.artisan._id,         // Coming FROM Artisan
      onModelRecipient: 'Customer',
      onModelSender: 'Artisan',
      message: `Your reservation status has been updated to: ${status}`,
      type: 'status_update'
    });

    res.json(reservation);
  } catch (error) {
    res.status(500).json({ message: 'Update failed' });
  }
});

module.exports = router;