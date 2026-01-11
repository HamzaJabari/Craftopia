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
      artisanId, projectId, quantity, note, 
      customTitle, customImage, 
      deliveryDate // <--- GET THIS FROM BODY
    } = req.body;

    // Validate Date
    if (!deliveryDate) {
      return res.status(400).json({ message: 'Please specify a delivery date.' });
    }

    const qty = quantity ? parseInt(quantity) : 1;
    // ... (rest of artisan/project finding logic) ...

    let newOrderData = {
      customer: req.customer._id,
      artisan: artisanId,
      quantity: qty,
      note: note || '',
      deliveryDate: deliveryDate, // <--- SAVE IT
      status: 'pending'
    };

    // ... (rest of logic for portfolio vs custom) ...

    const order = await Order.create(newOrderData);
    res.status(201).json(order);

  } catch (error) {
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
router.put('/:id/status', protectArtisan, async (req, res) => {
  try {
    const { status, price } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.artisan.toString() !== req.artisan._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // SCENARIO 1: Custom Request Logic (Making an Offer)
    if (order.type === 'custom_request' && price) {
      order.price = Number(price);
      order.totalPrice = Number(price) * order.quantity;
      
      // CRITICAL CHANGE: We don't accept immediately. We mark it as "Offer Received".
      order.status = 'offer_received'; 
    } 
    // SCENARIO 2: Normal Status Update (e.g., pending -> accepted for normal orders)
    else if (status) {
      order.status = status;
    }

    await order.save();
    res.json(order);

  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
router.put('/:id/customer-response', protectCustomer, async (req, res) => {
  try {
    const { action } = req.body; // action: 'accept' or 'reject'
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.customer.toString() !== req.customer._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Only allow this if an offer has actually been made
    if (order.status !== 'offer_received') {
      return res.status(400).json({ message: 'No pending offer to respond to.' });
    }

    if (action === 'accept') {
      order.status = 'accepted'; // NOW the deal is done!
    } else if (action === 'reject') {
      order.status = 'cancelled'; // Customer didn't like the price
    }

    await order.save();
    res.json(order);

  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;    