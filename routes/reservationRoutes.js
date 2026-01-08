const Artisan = require('../models/ArtisanModel');
const express = require('express');
const router = express.Router();
const Reservation = require('../models/ReservationModel');
const Notification = require('../models/NotificationModel');
const { protectCustomer, protectArtisan } = require('../middleware/authMiddleware');

// =======================================================
// 1. CREATE ORDER OR CUSTOM REQUEST (Customer)
// Endpoint: POST /api/reservations
// =======================================================
router.post('/', protectCustomer, async (req, res) => {
  try {
    const { 
      artisanId, 
      job_type, 
      title, 
      description, 
      deadline, 
      quantity, 
      reference_image 
    } = req.body;

    let initialPrice = 0;
    let initialStatus = 'Pending';

    // LOGIC: If it's a "Standard Order", calculate the price automatically
    if (job_type === 'Order' && reference_image) {
      // 1. Find the Artisan
      const artisan = await Artisan.findById(artisanId);
      
      // 2. Find the specific item in their portfolio
      const item = artisan.portfolioImages.find(img => img.imageUrl === reference_image);
      
      if (item && item.price) {
        // 3. Calculate Total: (Item Price * Quantity)
        initialPrice = item.price * (quantity || 1);
        
        // OPTIONAL: If price is set, maybe status starts as 'Price_Proposed' instead of 'Pending'?
        // For now, let's keep it 'Pending' so Artisan can confirm stock/shipping.
        initialStatus = 'Pending'; 
      }
    }

    const newJob = await Reservation.create({
      customer: req.customer._id,
      artisan: artisanId,
      job_type: job_type || 'Custom_Request',
      title: title || 'New Request',
      description,
      deadline,
      quantity: quantity || 1,
      reference_image,
      
      status: initialStatus,
      agreed_price: initialPrice // <--- The calculated price is saved here!
    });

    // Notify Artisan
    await Notification.create({
      recipient: artisanId,
      sender: req.customer._id,
      onModelRecipient: 'Artisan',
      onModelSender: 'Customer',
      message: `New ${job_type}: ${title} (Value: $${initialPrice})`,
      type: 'booking'
    });

    res.status(201).json(newJob);

  } catch (error) {
    console.error("CREATE ERROR:", error);
    res.status(500).json({ message: 'Failed to create request' });
  }
});

// =======================================================
// 2. GET MY REQUESTS (Customer)
// Endpoint: GET /api/reservations/customer
// =======================================================
router.get('/customer', protectCustomer, async (req, res) => {
  try {
    const jobs = await Reservation.find({ customer: req.customer._id })
      .populate('artisan', 'name email phone location')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching history' });
  }
});

// =======================================================
// 3. GET INCOMING JOBS (Artisan)
// Endpoint: GET /api/reservations/artisan
// =======================================================
router.get('/artisan', protectArtisan, async (req, res) => {
  try {
    const jobs = await Reservation.find({ artisan: req.artisan._id })
      // CHANGE 'phone' TO 'phone_number'
      .populate('customer', 'name email phone_number location') 
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching jobs' });
  }
});
// =======================================================
// 4. UPDATE STATUS & PRICE (Artisan)
// Endpoint: PUT /api/reservations/:id/status
// =======================================================
// =======================================================
// 4. ARTISAN: SET PRICE OR UPDATE STATUS
// Endpoint: PUT /api/reservations/:id/status
// =======================================================
router.put('/:id/status', protectArtisan, async (req, res) => {
  try {
    const { status, price } = req.body; 
    const job = await Reservation.findById(req.params.id);

    if (!job) return res.status(404).json({ message: 'Job not found' });

    // LOGIC: If Artisan sets a price, we wait for Customer approval
    if (price) {
      job.agreed_price = price;
      job.status = 'Price_Proposed'; // <--- AUTOMATIC STATUS CHANGE
    } else if (status) {
      // Otherwise, just update status (e.g., to 'In_Progress' or 'Completed')
      job.status = status;
    }

    await job.save();

    // Notify the Customer
    await Notification.create({
      recipient: job.customer,
      sender: req.artisan._id,
      onModelRecipient: 'Customer',
      onModelSender: 'Artisan',
      message: price 
        ? `Artisan proposed a price: $${price}. Please Accept or Negotiate.` 
        : `Update on "${job.title}": Status is now ${job.status}`,
      type: 'status_update'
    });

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Update failed' });
  }
});
// =======================================================
// 5. CUSTOMER: REPLY TO PRICE (Accept/Negotiate/Reject)
// Endpoint: PUT /api/reservations/:id/reply
// =======================================================
router.put('/:id/reply', protectCustomer, async (req, res) => {
  try {
    const { response, note } = req.body; // response = 'accept', 'reject', or 'negotiate'
    const job = await Reservation.findById(req.params.id);

    if (!job) return res.status(404).json({ message: 'Job not found' });

    // SECURITY: Only the owner can reply
    if (job.customer.toString() !== req.customer._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // HANDLE RESPONSES
    if (response === 'accept') {
      job.status = 'Accepted';
      // Notify Artisan: "Good news!"
      await Notification.create({
        recipient: job.artisan,
        sender: req.customer._id,
        onModelRecipient: 'Artisan',
        onModelSender: 'Customer',
        message: `Deal Accepted! Customer agreed to $${job.agreed_price}. You can start work.`,
        type: 'status_update'
      });

    } else if (response === 'negotiate') {
      job.status = 'Negotiating';
      // Notify Artisan: "Customer wants to talk"
      await Notification.create({
        recipient: job.artisan,
        sender: req.customer._id,
        onModelRecipient: 'Artisan',
        onModelSender: 'Customer',
        message: `Negotiation: Customer says: "${note || 'Can we change the price?'}"`,
        type: 'status_update'
      });

    } else if (response === 'reject') {
      job.status = 'Rejected';
      await Notification.create({
        recipient: job.artisan,
        sender: req.customer._id,
        onModelRecipient: 'Artisan',
        onModelSender: 'Customer',
        message: `Job Rejected by Customer.`,
        type: 'status_update'
      });
    }

    await job.save();
    res.json(job);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Reply failed' });
  }
});

module.exports = router;