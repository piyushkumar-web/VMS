const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ CORS (updated with your frontend)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://vms-nine-bay.vercel.app'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// ✅ Routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/visitors', require('../routes/visitors'));
app.use('/api/blacklist', require('../routes/blacklist'));
app.use('/api/logs', require('../routes/logs'));

// ✅ Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ✅ Root endpoint
app.get('/', (_, res) => {
  res.json({ message: 'VMS Backend API is running' });
});

// ✅ MongoDB connection (cached)
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log('MongoDB connected');

    // ✅ Seed users (only once)
    const User = require('../models/User');

    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        name: 'Super Admin',
        email: 'admin@vms.com',
        password: 'Admin@123',
        role: 'admin'
      });
      console.log('Default admin created');
    }

    const guardExists = await User.findOne({ role: 'guard' });
    if (!guardExists) {
      await User.create({
        name: 'Default Guard',
        email: 'guard@vms.com',
        password: 'Guard@123',
        role: 'guard'
      });
      console.log('Default guard created');
    }

  } catch (err) {
    console.error('MongoDB error:', err);
  }
};

// ✅ Ensure DB connects before every request
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

module.exports = app;
