const mongoose = require('mongoose');
const Artisan = require('./ArtisanModel'); // <--- Import Artisan Model

const ReviewSchema = new mongoose.Schema({
  // The customer who wrote the review (Table 35)
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  // The artisan being reviewed (Table 35)
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan',
    required: true
  },
  // Number of stars 1-5 (Table 35)
  stars_number: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  // Text comment (Table 35)
  comment: {
    type: String,
    required: true
  },
  // Date of review (Table 35)
  review_date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// =======================================================
// THE CALCULATOR (Static Method)
// =======================================================
ReviewSchema.statics.calcAverageRatings = async function (artisanId) {
  try {
    const stats = await this.aggregate([
      {
        $match: { artisan: artisanId }, 
      },
      {
        $group: {
          _id: '$artisan',
          nRating: { $sum: 1 }, 
          // IMPORTANT: We use YOUR field name here ($stars_number)
          avgRating: { $avg: '$stars_number' }, 
        },
      },
    ]);

    // Update the Artisan Document
    if (stats.length > 0) {
      await Artisan.findByIdAndUpdate(artisanId, {
        numReviews: stats[0].nRating,
        rating: stats[0].avgRating,
      });
    } else {
      await Artisan.findByIdAndUpdate(artisanId, {
        numReviews: 0,
        rating: 0,
      });
    }
  } catch (err) {
    console.error(err);
  }
};

// =======================================================
// TRIGGER THE CALCULATOR
// =======================================================
ReviewSchema.post('save', function () {
  // Run the calculator after a review is saved
  this.constructor.calcAverageRatings(this.artisan);
});

module.exports = mongoose.model('Review', ReviewSchema);