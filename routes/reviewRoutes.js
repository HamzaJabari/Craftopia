const express = require('express');
const router = express.Router();
const Review = require('../models/ReviewModel');
const Artisan = require('../models/ArtisanModel');
const Notification = require('../models/NotificationModel');
const { protectCustomer } = require('../middleware/authMiddleware');

// =======================================================
// CREATE A REVIEW (Table 15)
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

    // 1. Update the Artisan's Average Rating automatically (Table 2.2.5)
    const reviews = await Review.find({ artisan: artisanId });
    const avgRating = reviews.reduce((acc, item) => item.stars_number + acc, 0) / reviews.length;
    
    await Artisan.findByIdAndUpdate(artisanId, { averageRating: avgRating });

    // 2. 🔔 NOTIFICATION: Alert the Artisan of the new review (Table 21/22)
    await Notification.create({
      recipient: artisanId,
      recipientModel: 'Artisan',
      message: `You received a new ${stars_number}-star review from ${req.customer.name}`,
      type: 'Review'
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting review' });
  }
});

// GET REVIEWS FOR SPECIFIC ARTISAN
router.get('/:artisanId', async (req, res) => {
    try {
      const reviews = await Review.find({ artisan: req.params.artisanId })
        .populate('customer', 'name')
        .sort({ createdAt: -1 });
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching reviews' });
    }
});
// =======================================================
// GET REVIEWS FOR A SPECIFIC ARTISAN
// Method: GET /api/reviews/artisan/:artisanId
// =======================================================
router.get('/artisan/:artisanId', async (req, res) => {
  try {
    const reviews = await Review.find({ artisan: req.params.artisanId })
      .populate('customer', 'name') // Shows who wrote the review
      .sort({ createdAt: -1 }); // Newest reviews first

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

module.exports = router;