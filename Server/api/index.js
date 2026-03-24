const express = require('express');
const serverless = require('serverless-http');

const app = express();

app.use(express.json());

// ✅ ROOT ENDPOINT - MINIMAL TEST
app.get('/', (req, res) => {
  res.json({ 
    message: 'VMS Backend is working!',
    timestamp: new Date().toISOString()
  });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// ✅ Export for Vercel
module.exports = serverless(app);
