// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');

// const app = express();

// app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'], credentials: true }));
// app.use(express.json({ limit: '10mb' }));

// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/visitors', require('./routes/visitors'));
// app.use('/api/blacklist', require('./routes/blacklist'));
// app.use('/api/logs', require('./routes/logs'));

// app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// mongoose.connect(process.env.MONGO_URI)
//   .then(async () => {
//     console.log('MongoDB connected');
//     // Seed default admin if none exists
//     const User = require('./models/User');
//     const adminExists = await User.findOne({ role: 'admin' });
//     if (!adminExists) {
//       await User.create({ name: 'Super Admin', email: 'admin@vms.com', password: 'Admin@123', role: 'admin' });
//       console.log('Default admin created: admin@vms.com / Admin@123');
//     }
//     const guardExists = await User.findOne({ role: 'guard' });
//     if (!guardExists) {
//       await User.create({ name: 'Default Guard', email: 'guard@vms.com', password: 'Guard@123', role: 'guard' });
//       console.log('Default guard created: guard@vms.com / Guard@123');
//     }
//   })
//   .catch(err => console.error('MongoDB error:', err));

// app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));


require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({ 
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'], 
  credentials: true 
}));
app.use(express.json({ limit: '10mb' }));

// Database Connection Logic (Serverless optimized)
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    const db = await mongoose.connect(process.env.MONGO_URI);
    isConnected = db.connections[0].readyState;
    console.log('MongoDB connected');
    
    // Seed default users (Keep this here for first-run setup)
    const User = require('../models/User'); // Adjusted path for api/ folder
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({ name: 'Super Admin', email: 'admin@vms.com', password: 'Admin@123', role: 'admin' });
    }
    const guardExists = await User.findOne({ role: 'guard' });
    if (!guardExists) {
      await User.create({ name: 'Default Guard', email: 'guard@vms.com', password: 'Guard@123', role: 'guard' });
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
};

// Middleware to ensure DB is connected before every request
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Routes - IMPORTANT: Ensure paths to route files are correct (../)
app.use('/api/auth', require('../routes/auth'));
app.use('/api/visitors', require('../routes/visitors'));
app.use('/api/blacklist', require('../routes/blacklist'));
app.use('/api/logs', require('../routes/logs'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', environment: 'vercel' }));

// DO NOT use app.listen() here. 
// Export the app for Vercel to handle.
module.exports = app;