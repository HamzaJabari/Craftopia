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