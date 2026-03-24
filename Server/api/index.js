const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const serverless = require('serverless-http');
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

// ✅ Test endpoint (no DB required)
app.get('/test', (_, res) => {
  res.json({ 
    message: 'Backend is working!',
    mongoUri: process.env.MONGO_URI ? '✓ Set' : '✗ Missing',
    jwtSecret: process.env.JWT_SECRET ? '✓ Set' : '✗ Missing'
  });
});

// ✅ Root endpoint
app.get('/', (_, res) => {
  res.json({ 
    message: 'VMS Backend API is running',
    endpoints: {
      test: '/test',
      health: '/api/health',
      auth: '/api/auth/login'
    }
  });
});

// ✅ Routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/visitors', require('../routes/visitors'));
app.use('/api/blacklist', require('../routes/blacklist'));
app.use('/api/logs', require('../routes/logs'));

// ✅ Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mongoConnected: isConnected });
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
  console.error(`404 NOT FOUND: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.path,
    availableEndpoints: ['/', '/test', '/api/health', '/api/auth/login', '/api/visitors', '/api/blacklist', '/api/logs']
  });
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// ✅ Export for Vercel
module.exports = serverless(app);
