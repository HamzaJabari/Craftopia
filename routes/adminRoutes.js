// ... (Your existing imports: express, models, bcrypt, etc.)
const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/authMiddleware');
const Artisan = require('../models/ArtisanModel');
// ... (Keep your other admin routes like Login, Stats, Broadcast, Reviews) ...

// =======================================================
// DELETE ARTISAN CONTENT (Moderation - UPDATED)
// Endpoint: DELETE /api/admin/portfolio
// Body: { "artisanId": "...", "imageUrl": "..." }
// =======================================================
router.delete('/portfolio', protectAdmin, async (req, res) => {
  try {
    const { artisanId, imageUrl } = req.body;
    
    const artisan = await Artisan.findById(artisanId);
    if (!artisan) return res.status(404).json({ message: 'Artisan not found' });

    // NEW LOGIC: Filter out the object where imageUrl matches
    artisan.portfolioImages = artisan.portfolioImages.filter(
      item => item.imageUrl !== imageUrl
    );

    await artisan.save();
    res.json({ message: 'Content removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Content deletion failed' });
  }
});

module.exports = router;