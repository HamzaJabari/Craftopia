const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// 1. Import Routes
const artisanRoutes = require('./routes/artisanRoutes');
const customerRoutes = require('./routes/customerRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Initialize App & Environment
dotenv.config();
connectDB();
const app = express();

// 2. Middlewares
app.use(cors());
app.use(express.json()); // Essential for reading JSON bodies

// 3. Static Folder for Images (Very Important for your teammate!)
// This makes the 'uploads' folder public so images can be viewed in the browser
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// 4. Use Routes (The order matches your handover document)
app.use('/api/artisans', artisanRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// 5. Default Route
app.get('/', (req, res) => {
  res.send('Craftopia API is running...');
});

// 6. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});