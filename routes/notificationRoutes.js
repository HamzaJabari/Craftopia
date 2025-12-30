const express = require('express');
const router = express.Router();
const Notification = require('../models/NotificationModel');
const { protectCustomer, protectArtisan } = require('../middleware/authMiddleware');

// =======================================================
// 1. GET ALL MY NOTIFICATIONS
// Works for both Artisans and Customers
// =======================================================
router.get('/', async (req, res) => {
  try {
    // We check for the user ID from the token (works for both roles)
    // The middleware attaches the user to req.customer or req.artisan
    const userId = req.customer?._id || req.artisan?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 }) // Show newest alerts at the top
      .limit(20); // Keep it fast by showing only the last 20

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// =======================================================
// 2. MARK NOTIFICATIONS AS READ
// Method: PUT /api/notifications/read
// =======================================================
router.put('/read', async (req, res) => {
  try {
    const userId = req.customer?._id || req.artisan?._id;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

module.exports = router;