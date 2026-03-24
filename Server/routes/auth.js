const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated' });
    res.json({ token: signToken(user._id), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users (admin only)
router.get('/guards', protect, adminOnly, async (req, res) => {
  const guards = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(guards);
});

// Create user (admin only)
router.post('/create', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already exists' });
    const user = await User.create({ name, email, password, role, phone, createdBy: req.user._id });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle user active status
router.patch('/:id/toggle', protect, adminOnly, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ isActive: user.isActive });
});

// Delete user
router.delete('/:id', protect, adminOnly, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});

// Get current user profile
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
