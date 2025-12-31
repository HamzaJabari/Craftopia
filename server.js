// server.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const path = require('path');

// Import Routes
const artisanRoutes = require('./routes/artisanRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const customerRoutes = require('./routes/customerRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');



const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(express.json());

// Routes
app.use('/api/artisans', artisanRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));