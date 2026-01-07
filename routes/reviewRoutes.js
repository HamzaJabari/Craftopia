const express = require('express');
const router = express.Router();
const Review = require('../models/ReviewModel');
const Notification = require('../models/NotificationModel');
const { protectCustomer } = require('../middleware/authMiddleware');

// =======================================================
// 1. POST A REVIEW (Customer Only)
// Endpoint: POST /api/reviews
// =======================================================
router.post('/', protectCustomer, async (req, res) => {
  try {
    const { artisanId, stars_number, comment } = req.body;

    // 1. Validation Check
    if (!artisanId) {
      return res.status(400).json({ message: 'Missing field: artisanId' });
    }
    if (!stars_number || stars_number < 1 || stars_number > 5) {
      return res.status(400).json({ message: 'stars_number must be between 1 and 5' });
    }
    if (!comment) {
      return res.status(400).json({ message: 'Missing field: comment' });
    }

    // 2. Check if Customer already reviewed this Artisan (Optional prevention)
    const alreadyReviewed = await Review.findOne({
      customer: req.customer._id,
      artisan: artisanId
    });

    if (alreadyReviewed) {
      return res.status(400).json({ message: 'You have already reviewed this artisan' });
    }

    // 3. Create Review
    const review = await Review.create({
      customer: req.customer._id,
      artisan: artisanId,
      stars_number,
      comment
    });

    // 4. Notify the Artisan
    await Notification.create({
        recipient: artisanId,
        sender: req.customer._id,
        onModelRecipient: 'Artisan',
        onModelSender: 'Customer',
        message: `You received a ${stars_number}-star review!`,
        type: 'review'
    });

    res.status(201).json(review);
  } catch (error) {
    console.error("REVIEW ERROR:", error); // Check VS Code terminal if this happens
    res.status(500).json({ message: 'Failed to post review', error: error.message });
  }
});

// =======================================================
// 2. GET REVIEWS FOR ARTISAN (Public)
// Endpoint: GET /api/reviews/:artisanId
// =======================================================
router.get('/:artisanId', async (req, res) => {
  try {
    const reviews = await Review.find({ artisan: req.params.artisanId })
      .populate('customer', 'name profilePicture') // Show reviewer name & pic
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

module.exports = router;