const express = require('express');
const Log = require('../models/Log');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', protect, adminOnly, async (req, res) => {
  const logs = await Log.find().sort({ createdAt: -1 }).limit(100);
  res.json(logs);
});

module.exports = router;
