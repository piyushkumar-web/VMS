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

const app = express();

// ✅ Allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://vms-nine-bay.vercel.app'
];

// ✅ CORS middleware (FULL FIX)
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow frontend origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  // Important for caching proxies
  res.setHeader('Vary', 'Origin');

  // Allow all required methods
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  );

  // Allow all headers (CRITICAL FIX)
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  // Allow credentials (safe even if not used)
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// ✅ Middleware
app.use(express.json({ limit: '10mb' }));

// ✅ Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/visitors', require('./routes/visitors'));
app.use('/api/blacklist', require('./routes/blacklist'));
app.use('/api/logs', require('./routes/logs'));

// ✅ Root route
app.get('/', (req, res) => {
  res.send('VMS Backend Running 🚀');
});

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');

    const User = require('./models/User');

    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        name: 'Super Admin',
        email: 'admin@vms.com',
        password: 'Admin@123',
        role: 'admin'
      });
    }

    const guardExists = await User.findOne({ role: 'guard' });
    if (!guardExists) {
      await User.create({
        name: 'Default Guard',
        email: 'guard@vms.com',
        password: 'Guard@123',
        role: 'guard'
      });
    }
  })
  .catch(err => console.error('MongoDB error:', err));

// ✅ Port (Render compatible)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

