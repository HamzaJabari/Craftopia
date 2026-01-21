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

    // Search for existing day for this artisan
    const availability = await Availability.findOneAndUpdate(
      { artisan: req.artisan._id, day: day }, // Search criteria
      { start_time, end_time },               // New Data
      { new: true, upsert: true }             // Options: Return new doc, Create if missing
    );

    res.status(200).json(availability);
  } catch (error) {
    console.error(error);
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
router.delete('/:id', protectArtisan, async (req, res) => {
  try {
    // 1. Find the availability record
    const availability = await Availability.findById(req.params.id);

    if (!availability) {
      return res.status(404).json({ message: 'Availability not found' });
    }

    // 2. Security Check: Ensure this day belongs to the logged-in Artisan
    if (availability.artisan.toString() !== req.artisan._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // 3. Delete it
    await Availability.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Availability removed successfully' });

  } catch (error) {
    console.error("Delete Availability Error:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});
module.exports = router;