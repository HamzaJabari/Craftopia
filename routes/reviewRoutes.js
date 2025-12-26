const express = require('express');
const router = express.Router();
const Review = require('../models/ReviewModel');
const Artisan = require('../models/ArtisanModel');
const { protectCustomer } = require('../middleware/authMiddleware');

// =======================================================
// CREATE A REVIEW (Customer Action - Table 15)
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

    // OPTIONAL: Update the Artisan's average rating automatically
    const reviews = await Review.find({ artisan: artisanId });
    const avgRating = reviews.reduce((acc, item) => item.stars_number + acc, 0) / reviews.length;
    
    await Artisan.findByIdAndUpdate(artisanId, { averageRating: avgRating });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting review' });
  }
});

module.exports = router;