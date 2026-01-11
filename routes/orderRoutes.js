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
// DEBUG VERSION OF CREATE ORDER
// =======================================================
// CREATE ORDER (Unified: Portfolio & Custom)
// Endpoint: POST /api/orders
// =======================================================
router.post('/', protectCustomer, async (req, res) => {
  try {
    const { 
      artisanId, projectId, quantity, note, 
      customTitle, customImage, deliveryDate 
    } = req.body;

    // 1. Validate Artisan Exists
    const artisan = await Artisan.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan not found' });
    }

    // 2. Prepare Basic Order Data
    const qty = quantity ? parseInt(quantity) : 1;
    let newOrderData = {
      customer: req.customer._id,
      artisan: artisanId,
      quantity: qty,
      note: note || '',
      deliveryDate: deliveryDate, 
      status: 'pending'
    };

    // 3. SCENARIO A: NORMAL ORDER (From Portfolio)
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
    // 4. SCENARIO B: CUSTOM REQUEST (Reservation)
    else {
      if (!customTitle) return res.status(400).json({ message: 'Custom title is required.' });
      if (!deliveryDate) return res.status(400).json({ message: 'Delivery date is required.' });

      newOrderData.type = 'custom_request';
      newOrderData.title = customTitle;
      newOrderData.image = customImage || '';
      newOrderData.price = 0; // Price pending
      newOrderData.totalPrice = 0;
    }

    // 5. Save to DB
    const order = await Order.create(newOrderData);
    res.status(201).json(order);

  } catch (error) {
    console.error("Create Order Error:", error);
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
    const { action, note } = req.body; // action: 'accept', 'reject', 'negotiate'
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.customer.toString() !== req.customer._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (order.status !== 'offer_received') {
      return res.status(400).json({ message: 'No pending offer to respond to.' });
    }

    // --- OPTION 1: ACCEPT ---
    if (action === 'accept') {
      order.status = 'accepted'; 
    } 
    
    // --- OPTION 2: REJECT ---
    else if (action === 'reject') {
      order.status = 'cancelled'; 
      if (note) order.note = note; // Optional reason for rejecting
    } 
    
    // --- OPTION 3: NEGOTIATE (Send it back to Artisan) ---
    else if (action === 'negotiate') {
      if (!note) {
        return res.status(400).json({ message: 'Please add a note explaining your offer.' });
      }
      
      order.status = 'pending'; // Send it back to the Artisan!
      // We append the customer's feedback to the note so the Artisan sees it
      order.note = `[Customer Feedback]: ${note} (Previous Note: ${order.note || ''})`;
    }

    await order.save();
    res.json(order);

  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
module.exports = router;    