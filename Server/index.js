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

// ✅ CORS (FIXED for your live frontend + local dev)
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://vms-nine-bay.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// ✅ Handle preflight requests (IMPORTANT for CORS)
app.options('*', cors());

// ✅ Middleware
app.use(express.json({ limit: '10mb' }));

// ✅ Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/visitors', require('./routes/visitors'));
app.use('/api/blacklist', require('./routes/blacklist'));
app.use('/api/logs', require('./routes/logs'));

// ✅ Root route (optional but useful)
app.get('/', (req, res) => {
  res.send('VMS Backend Running 🚀');
});

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ✅ MongoDB connect + seed
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
  })
  .catch(err => console.error('MongoDB error:', err));

// ✅ Use PORT properly (Render uses dynamic port)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

