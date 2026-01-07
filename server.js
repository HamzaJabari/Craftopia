const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

// Import Routes
const customerRoutes = require('./routes/customerRoutes');
const artisanRoutes = require('./routes/artisanRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes'); // <--- ADDED THIS
const portfolioRoutes = require('./routes/portfolioRoutes');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/craftopia')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Mount Routes
app.use('/api/customers', customerRoutes);
app.use('/api/artisans', artisanRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/availability', availabilityRoutes); // <--- ADDED THIS

// Default Route
app.get('/', (req, res) => {
  res.send('Craftopia API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.use('/api/portfolio', portfolioRoutes);