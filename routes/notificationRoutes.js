const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../models/NotificationModel');
const Artisan = require('../models/ArtisanModel');
const Customer = require('../models/CustomerModel');

/**
 * FIXED MIDDLEWARE: Checks both collections manually.
 * This works for Artisans AND Customers without throwing a fake 401 error.
 */
const protectAny = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 1. Check if it's an Artisan
      const artisan = await Artisan.findById(decoded.id).select('-password');
      if (artisan) {
        req.artisan = artisan;
        return next();
      }

      // 2. If not Artisan, check if it's a Customer
      const customer = await Customer.findById(decoded.id).select('-password');
      if (customer) {
        req.customer = customer;
        return next();
      }

      // 3. If neither, then fail
      return res.status(401).json({ message: 'Not authorized, user not found' });

    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// =======================================================
// 1. GET ALL NOTIFICATIONS
// Method: GET /api/notifications
// =======================================================
router.get('/', protectAny, async (req, res) => {
  try {
    // Determine the ID from whichever check succeeded
    const userId = req.artisan?._id || req.customer?._id;

    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 }) // Newest first
      .limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// =======================================================
// 2. MARK ALL AS READ
// Method: PUT /api/notifications/read
// =======================================================
router.put('/read', protectAny, async (req, res) => {
  try {
    const userId = req.artisan?._id || req.customer?._id;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications' });
  }
});

// =======================================================
// 3. DELETE A SPECIFIC NOTIFICATION
// Method: DELETE /api/notifications/:id
// =======================================================
router.delete('/:id', protectAny, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    const userId = req.artisan?._id || req.customer?._id;

    // Security check: Only the recipient can delete their own notification
    if (notification && notification.recipient.toString() === userId.toString()) {
      await notification.deleteOne();
      res.json({ message: 'Notification removed' });
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

module.exports = router;