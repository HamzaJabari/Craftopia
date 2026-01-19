const express = require('express');
const router = express.Router();
const Order = require('../models/OrderModel');
const Artisan = require('../models/ArtisanModel');
const Notification = require('../models/NotificationModel');
const { protectCustomer, protectArtisan } = require('../middleware/authMiddleware');

// =======================================================
// 1. CREATE ORDER (Unified: Portfolio & Custom)
// Endpoint: POST /api/orders
// Access: Customer Only
// =======================================================
router.post('/', protectCustomer, async (req, res) => {
  try {
    const { 
      artisanId, projectId, quantity, note, 
      customTitle, customImage, deliveryDate 
    } = req.body;

    // A. Validate Artisan
    const artisan = await Artisan.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan not found' });
    }

    // B. Setup Basic Order Data
    const qty = quantity ? parseInt(quantity) : 1;
    let newOrderData = {
      customer: req.customer._id,
      artisan: artisanId,
      quantity: qty,
      note: note || '',
      deliveryDate: deliveryDate, 
      status: 'pending'
    };

    // C. Determine Type: Portfolio Order OR Custom Request
    let notificationMessage = '';

    if (projectId) {
      // --- SCENARIO 1: PORTFOLIO ORDER ---
      const project = artisan.portfolio.id(projectId);
      if (!project) return res.status(404).json({ message: 'Project not found' });

      newOrderData.type = 'portfolio_order';
      newOrderData.projectId = project._id;
      newOrderData.title = project.title;
      newOrderData.image = project.coverImage;
      newOrderData.price = project.price;
      newOrderData.totalPrice = project.price * qty;

      notificationMessage = `New Order: ${qty}x ${project.title}`;
    } else {
      // --- SCENARIO 2: CUSTOM REQUEST ---
      if (!customTitle) return res.status(400).json({ message: 'Custom title is required.' });
      if (!deliveryDate) return res.status(400).json({ message: 'Delivery date is required.' });

      newOrderData.type = 'custom_request';
      newOrderData.title = customTitle;
      newOrderData.image = customImage || '';
      newOrderData.price = 0; // Price TBD by Artisan
      newOrderData.totalPrice = 0;

      notificationMessage = `New Custom Request: ${customTitle}`;
    }

    // D. Save Order
    const order = await Order.create(newOrderData);

    // E. Send Notification to Artisan
    await Notification.create({
      recipient: artisanId,
      onModelRecipient: 'Artisan',
      sender: req.customer._id,
      onModelSender: 'Customer',
      message: notificationMessage,
      type: 'booking'
    });

    res.status(201).json(order);

  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// 2. GET CUSTOMER ORDERS
// Endpoint: GET /api/orders/customer
// =======================================================
// =======================================================
// 2. GET CUSTOMER ORDERS (With Artisan Details)
// Endpoint: GET /api/orders/customer
// =======================================================
router.get('/customer', protectCustomer, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.customer._id })
      .populate('artisan', 'name email phone location') // <--- Add this
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
// =======================================================
// 3. GET ARTISAN ORDERS
// Endpoint: GET /api/orders/artisan
// =======================================================
router.get('/artisan', protectArtisan, async (req, res) => {
  try {
    const orders = await Order.find({ artisan: req.artisan._id })
      // FIXED: changed 'phone' to 'phone_number'
      .populate('customer', 'name email phone_number location avatar') 
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});
// =======================================================
// 4. ARTISAN ACTION: UPDATE STATUS / MAKE OFFER
// Endpoint: PUT /api/orders/:id/status
// Access: Artisan Only
// =======================================================
router.put('/:id/status', protectArtisan, async (req, res) => {
  try {
    const { status, price } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.artisan.toString() !== req.artisan._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // A. Logic for Custom Request (Making an Offer)
    if (order.type === 'custom_request' && price) {
      order.price = Number(price);
      order.totalPrice = Number(price) * order.quantity;
      order.status = 'offer_received'; 
    } 
    // B. Logic for Standard Status Update
    else if (status) {
      order.status = status;
    }

    await order.save();

    // C. Send Notification to Customer
    let alertMsg = '';
    let notifType = 'status_update';

    if (status === 'completed') alertMsg = `Your order '${order.title}' is ready!`;
    if (status === 'cancelled') alertMsg = `Your order '${order.title}' was cancelled.`;
    if (order.status === 'offer_received') {
        alertMsg = `Artisan sent an offer of $${order.price} for '${order.title}'`;
        notifType = 'system_alert';
    }

    if (alertMsg) {
      await Notification.create({
        recipient: order.customer,
        onModelRecipient: 'Customer',
        sender: req.artisan._id,
        onModelSender: 'Artisan',
        message: alertMsg,
        type: notifType
      });
    }

    res.json(order);

  } catch (error) {
    console.error("Artisan Update Error:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// 5. CUSTOMER ACTION: RESPOND TO OFFER
// Endpoint: PUT /api/orders/:id/customer-response
// Access: Customer Only
// =======================================================
router.put('/:id/customer-response', protectCustomer, async (req, res) => {
  try {
    const { action, note } = req.body; // accept, reject, negotiate
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.customer.toString() !== req.customer._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (order.status !== 'offer_received') {
      return res.status(400).json({ message: 'No pending offer to respond to.' });
    }

    // A. Handle Response
    let replyMsg = '';

    if (action === 'accept') {
      order.status = 'accepted'; 
      replyMsg = `Customer accepted your price for '${order.title}'!`;
    } 
    else if (action === 'reject') {
      order.status = 'cancelled'; 
      replyMsg = `Customer rejected the offer for '${order.title}'.`;
    } 
    else if (action === 'negotiate') {
      if (!note) return res.status(400).json({ message: 'Note required for negotiation.' });
      order.status = 'pending'; // Send back to Artisan
      order.note = `[Customer Feedback]: ${note} (Prev: ${order.note || ''})`;
      replyMsg = `Customer wants to negotiate on '${order.title}'.`;
    }

    await order.save();

    // B. Send Notification to Artisan
    if (replyMsg) {
      await Notification.create({
        recipient: order.artisan,
        onModelRecipient: 'Artisan',
        sender: req.customer._id,
        onModelSender: 'Customer',
        message: replyMsg,
        type: 'status_update'
      });
    }

    res.json(order);

  } catch (error) {
    console.error("Customer Response Error:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// =======================================================
// 6. CUSTOMER ACTION: CANCEL ORDER (Before Acceptance)
// Endpoint: PUT /api/orders/:id/cancel
// Access: Customer Only
// =======================================================
router.put('/:id/cancel', protectCustomer, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    // 1. Check if order exists
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // 2. Check Ownership (Did this customer make the order?)
    if (order.customer.toString() !== req.customer._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // 3. Check Status (Rule: Can't cancel if already accepted/working)
    const nonCancellable = ['accepted', 'completed', 'cancelled'];
    if (nonCancellable.includes(order.status)) {
      return res.status(400).json({ 
        message: 'Cannot cancel. The Artisan has already accepted or completed this order.' 
      });
    }

    // 4. Update Status
    order.status = 'cancelled';
    await order.save();

    // 5. Notify Artisan (So they know not to work on it)
    await Notification.create({
      recipient: order.artisan,
      onModelRecipient: 'Artisan',
      sender: req.customer._id,
      onModelSender: 'Customer',
      message: `Customer cancelled the request for '${order.title}'.`,
      type: 'status_update'
    });

    res.json({ message: 'Order cancelled successfully', order });

  } catch (error) {
    console.error("Cancel Error:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});
module.exports = router;