const express = require('express');
const Blacklist = require('../models/Blacklist');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', protect, adminOnly, async (req, res) => {
  const list = await Blacklist.find().sort({ createdAt: -1 });
  res.json(list);
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { phone, reason } = req.body;
    const entry = await Blacklist.create({ phone, reason, addedBy: req.user._id, addedByName: req.user.name });
    res.status(201).json(entry);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Phone already blacklisted' });
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  await Blacklist.findByIdAndDelete(req.params.id);
  res.json({ message: 'Removed from blacklist' });
});

module.exports = router;
