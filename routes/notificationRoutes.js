const express = require('express');
const router = express.Router();
const Notification = require('../models/NotificationModel');
const { protectCustomer, protectArtisan } = require('../middleware/authMiddleware');

// =======================================================
// GET MY NOTIFICATIONS (Table 16 & 22)
// Method: GET /api/notifications
// =======================================================
router.get('/', async (req, res) => {
  try {
    // Logic to find notifications based on the logged-in user (Artisan or Customer)
    const userId = req.artisan ? req.artisan._id : req.customer._id;
    const notifications = await Notification.find({ recipient: userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

module.exports = router;