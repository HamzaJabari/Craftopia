// routes/portfolioRoutes.js
const express = require('express');
const router = express.Router();
const PortfolioComment = require('../models/PortfolioCommentModel');
const Notification = require('../models/NotificationModel');
const { protectCustomer } = require('../middleware/authMiddleware');

// =======================================================
// 1. ADD COMMENT TO PORTFOLIO IMAGE
// Endpoint: POST /api/portfolio/comment
// =======================================================

const Artisan = require('../models/ArtisanModel'); // <--- Make sure to import Artisan here!

// =======================================================
// 3. GET ALL IMAGES (For the Gallery Page)
// Endpoint: GET /api/portfolio/feed
// =======================================================
router.get('/feed', async (req, res) => {
  try {
    const feed = await Artisan.aggregate([
      // 1. Only get artisans who actually have images
      { $match: { portfolioImages: { $exists: true, $not: { $size: 0 } } } },
      
      // 2. "Unwind" the array (splits 1 artisan with 3 images into 3 separate documents)
      { $unwind: "$portfolioImages" },

      // 3. Select only the data we need for the card
      {
        $project: {
          _id: 0,
          imageUrl: "$portfolioImages",
          artisanId: "$_id",
          artisanName: "$name",
          craftType: "$craftType"
        }
      },

      // 4. (Optional) Randomize the order so it's not always the same users at the top
      { $sample: { size: 50 } } 
    ]);

    res.json(feed);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching feed' });
  }
});
router.post('/comment', protectCustomer, async (req, res) => {
  try {
    const { artisanId, imageUrl, comment } = req.body;

    // Create the comment
    const newComment = await PortfolioComment.create({
      customer: req.customer._id,
      artisan: artisanId,
      imageUrl: imageUrl,
      comment: comment
    });

    // Notify the Artisan
    await Notification.create({
      recipient: artisanId,
      sender: req.customer._id,
      onModelRecipient: 'Artisan',
      onModelSender: 'Customer',
      message: `New comment on your portfolio: "${comment.substring(0, 20)}..."`,
      type: 'comment'
    });

    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: 'Failed to post comment' });
  }
});

// =======================================================
// 2. GET COMMENTS FOR AN IMAGE
// Endpoint: GET /api/portfolio/comments?imageUrl=...
// =======================================================
router.get('/comments', async (req, res) => {
  try {
    const { imageUrl } = req.query;
    const comments = await PortfolioComment.find({ imageUrl })
      .populate('customer', 'name profilePicture')
      .sort({ createdAt: -1 });
    
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

module.exports = router;