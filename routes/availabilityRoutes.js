const express = require('express');
const router = express.Router();
const Availability = require('../models/AvailabilityModel');
const { protectArtisan } = require('../middleware/authMiddleware');

// =======================================================
// SET AVAILABILITY (Artisan Action - Table 18)
// Method: POST /api/availability
// =======================================================
router.post('/', protectArtisan, async (req, res) => {
  try {
    const { day, start_time, end_time } = req.body;

    // Create a new availability record linked to the logged-in artisan [cite: 555]
    const availability = await Availability.create({
      artisan: req.artisan._id,
      day,
      start_time,
      end_time
    });

    res.status(201).json(availability);
  } catch (error) {
    res.status(500).json({ message: 'Error setting availability' });
  }
});

// =======================================================
// GET ARTISAN AVAILABILITY (Public - Table 10)
// Method: GET /api/availability/:artisanId
// =======================================================
router.get('/:artisanId', async (req, res) => {
  try {
    const schedule = await Availability.find({ artisan: req.params.artisanId });
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching schedule' });
  }
});

module.exports = router;