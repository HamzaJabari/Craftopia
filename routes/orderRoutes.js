const express = require('express');
const router = express.Router();
const Order = require('../models/OrderModel');
const Artisan = require('../models/ArtisanModel');
const { protectCustomer, protectArtisan } = require('../middleware/authMiddleware');

// =======================================================
// CREATE ORDER (Customer Only)
// Endpoint: POST /api/orders
// =======================================================
router.post('/', protectCustomer, async (req, res) => {
  try {
    const { artisanId, projectId, note } = req.body;

    // 1. Find the Artisan
    const artisan = await Artisan.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan not found' });
    }

    // 2. Find the specific Project inside the Artisan's portfolio
    // Mongoose allows searching subdocuments by ID using .id()
    const project = artisan.portfolio.id(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found in artisan portfolio' });
    }

    // 3. Create the Order
    const order = await Order.create({
      customer: req.customer._id,
      artisan: artisanId,
      projectId: project._id,
      projectTitle: project.title,
      projectImage: project.coverImage || (project.media[0] ? project.media[0].url : ''),
      price: project.price, // Use the price from the DB, not the user input!
      note: note || ''
    });

    res.status(201).json(order);

  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// GET MY ORDERS (For Customer)
// Endpoint: GET /api/orders/my-orders
// =======================================================
router.get('/my-orders', protectCustomer, async (req, res) => {
  try {
    // Populate adds the Artisan's name to the result
    const orders = await Order.find({ customer: req.customer._id })
      .populate('artisan', 'name email phone location');
      
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// GET ARTISAN ORDERS (For Artisan)
// Endpoint: GET /api/orders/artisan-orders
// =======================================================
router.get('/artisan-orders', protectArtisan, async (req, res) => {
  try {
    // Populate adds the Customer's name/phone to the result
    const orders = await Order.find({ artisan: req.artisan._id })
      .populate('customer', 'name email phone_number location');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// UPDATE ORDER STATUS (For Artisan - e.g., Accept/Reject)
// Endpoint: PUT /api/orders/:id/status
// =======================================================
router.put('/:id/status', protectArtisan, async (req, res) => {
  try {
    const { status } = req.body; // e.g. "accepted", "completed"
    
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Ensure this order actually belongs to this artisan
    if (order.artisan.toString() !== req.artisan._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    order.status = status;
    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;