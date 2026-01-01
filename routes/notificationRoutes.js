const express = require('express');
const router = express.Router();
const Notification = require('../models/NotificationModel');
const { protectArtisan, protectCustomer } = require('../middleware/authMiddleware');

/**
 * HELPER MIDDLEWARE: This checks if the user is EITHER an Artisan or a Customer.
 * This prevents the "Not Authorized" error when testing in Postman.
 */
const protectAny = async (req, res, next) => {
    // If the token works for an Artisan, let them through
    return protectArtisan(req, res, () => {
        if (req.artisan) return next();
        
        // If not an artisan, try treating them as a Customer
        return protectCustomer(req, res, () => {
            if (req.customer) return next();
            
            // If neither, then they are truly unauthorized
            res.status(401).json({ message: "Not authorized to see notifications" });
        });
    });
};

// =======================================================
// 1. GET ALL NOTIFICATIONS
// Method: GET /api/notifications
// =======================================================
router.get('/', protectAny, async (req, res) => {
  try {
    // Determine the ID from whichever middleware succeeded
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