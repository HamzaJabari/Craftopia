const express = require('express');
const router = express.Router();
const Review = require('../models/ReviewModel');
const Notification = require('../models/NotificationModel');
const { protectCustomer } = require('../middleware/authMiddleware');

// =======================================================
// 1. POST A REVIEW (Customer)
// Method: POST /api/reviews
// =======================================================
router.post('/', protectCustomer, async (req, res) => {
  try {
    const { artisanId, stars_number, comment } = req.body;

    const review = await Review.create({
      customer: req.customer._id,
      artisan: artisanId,
      stars_number,
      comment
    });

    // TRIGGER NOTIFICATION for the Artisan
    await Notification.create({
      recipient: artisanId,
      sender: req.customer._id,
      message: `You received a new ${stars_number}-star review from ${req.customer.name}!`,
      type: 'review'
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Failed to post review' });
  }
});

// =======================================================
// 2. GET REVIEWS FOR A SPECIFIC ARTISAN (Public)
// Method: GET /api/reviews/artisan/:artisanId
// =======================================================
router.get('/artisan/:artisanId', async (req, res) => {
  try {
    const reviews = await Review.find({ artisan: req.params.artisanId })
      .populate('customer', 'name profilePicture') // Show who reviewed
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

module.exports = router;