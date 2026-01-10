const express = require('express');
const router = express.Router();
const Order = require('../models/OrderModel');
const Artisan = require('../models/ArtisanModel');
const { protectCustomer, protectArtisan } = require('../middleware/authMiddleware');

// =======================================================
// CREATE ORDER (Keep this standard / or /create)
// Endpoint: POST /api/orders
// =======================================================
// =======================================================
// CREATE ORDER (Handles BOTH Custom & Normal)
// Endpoint: POST /api/orders
// =======================================================
router.post('/', protectCustomer, async (req, res) => {
  try {
    const { 
      artisanId, 
      projectId, // Optional (Send ONLY for Normal Orders)
      quantity, 
      note, 
      customTitle, // Optional (Send ONLY for Custom Requests)
      customImage  // Optional (Reference photo link)
    } = req.body;

    const qty = quantity ? parseInt(quantity) : 1;
    const artisan = await Artisan.findById(artisanId);
    
    if (!artisan) return res.status(404).json({ message: 'Artisan not found' });

    let newOrderData = {
      customer: req.customer._id,
      artisan: artisanId,
      quantity: qty,
      note: note || '',
      status: 'pending'
    };

    // --- SCENARIO A: NORMAL ORDER (Project ID provided) ---
    if (projectId) {
      const project = artisan.portfolio.id(projectId);
      if (!project) return res.status(404).json({ message: 'Project not found' });

      newOrderData.type = 'portfolio_order';
      newOrderData.projectId = project._id;
      newOrderData.title = project.title;
      newOrderData.image = project.coverImage;
      newOrderData.price = project.price;
      newOrderData.totalPrice = project.price * qty;
    } 
    
    // --- SCENARIO B: CUSTOM REQUEST (No Project ID) ---
    else {
      newOrderData.type = 'custom_request';
      newOrderData.title = customTitle || 'Custom Request';
      newOrderData.image = customImage || ''; // They might send a reference photo URL
      newOrderData.price = 0; // Price is decided later by Artisan
      newOrderData.totalPrice = 0;
    }

    const order = await Order.create(newOrderData);
    res.status(201).json(order);

  } catch (error) {
    console.error("ORDER ERROR:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// GET CUSTOMER RESERVATIONS (The "Old" Route Name)
// Endpoint: GET /api/orders/reservations/customer
// =======================================================
router.get('/reservations/customer', protectCustomer, async (req, res) => {
  try {
    // This finds the NEW orders but returns them on the OLD route
    const orders = await Order.find({ customer: req.customer._id })
      .populate('artisan', 'name email phone location');
      
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// GET ARTISAN RESERVATIONS (Keeping it consistent)
// Endpoint: GET /api/orders/reservations/artisan
// =======================================================
router.get('/reservations/artisan', protectArtisan, async (req, res) => {
  try {
    const orders = await Order.find({ artisan: req.artisan._id })
      .populate('customer', 'name email phone_number location');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// GET SINGLE RESERVATION (By ID)
// Endpoint: GET /api/orders/:id
// =======================================================
router.get('/:id', protectCustomer, async (req, res) => {
    // ... (Same single order logic as before) ...
    try {
        const order = await Order.findById(req.params.id)
            .populate('artisan', 'name phone')
            .populate('customer', 'name phone_number');
        if(!order) return res.status(404).json({message: 'Not Found'});
        res.json(order);
    } catch(e) { res.status(500).json({message: 'Server Error'}); }
});

module.exports = router;    