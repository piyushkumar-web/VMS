// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');

// const app = express();

// // ✅ Allow your frontend
// app.use(cors({
//   origin: ['https://vms-nine-bay.vercel.app'],
//   credentials: true
// }));

// app.use(express.json({ limit: '10mb' }));

// // ✅ Routes (IMPORTANT: use ../ because inside /api)
// app.use('/api/auth', require('../routes/auth'));
// app.use('/api/visitors', require('../routes/visitors'));
// app.use('/api/blacklist', require('../routes/blacklist'));
// app.use('/api/logs', require('../routes/logs'));

// // ✅ Health check
// app.get('/api/health', (req, res) => {
//   res.json({ status: 'ok' });
// });

// // ✅ MongoDB connection (cached)
// let cached = global.mongoose;

// if (!cached) {
//   cached = global.mongoose = { conn: null, promise: null };
// }

// async function connectDB() {
//   if (cached.conn) return cached.conn;

//   if (!cached.promise) {
//     cached.promise = mongoose.connect(process.env.MONGO_URI, {
//       bufferCommands: false,
//     }).then((mongoose) => mongoose);
//   }

//   cached.conn = await cached.promise;
//   return cached.conn;
// }

// // ✅ Export handler (NO app.listen)
// module.exports = async (req, res) => {
//   await connectDB();
//   return app(req, res);
// };

module.exports = (req, res) => {
  res.status(200).json({ message: "API WORKING ✅" });
};