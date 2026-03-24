const express = require('express');
const QRCode = require('qrcode');
const Visitor = require('../models/Visitor');
const Blacklist = require('../models/Blacklist');
const Log = require('../models/Log');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

// Public: Submit visitor entry form
router.post('/register', async (req, res) => {
  try {
    const { phone } = req.body;
    const blacklisted = await Blacklist.findOne({ phone });
    if (blacklisted) return res.status(403).json({ message: 'Entry not permitted. Contact security.' });
    const visitor = await Visitor.create(req.body);
    const qrData = JSON.stringify({ visitorId: visitor.visitorId, id: visitor._id });
    const qrCode = await QRCode.toDataURL(qrData, { width: 400, margin: 2 });
    visitor.qrCode = qrCode;
    await visitor.save();
    res.status(201).json({ visitor, qrCode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public: Get visitor by visitorId (for QR scan)
router.get('/scan/:visitorId', async (req, res) => {
  try {
    const visitor = await Visitor.findOne({ visitorId: req.params.visitorId });
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Guard: Approve entry
router.patch('/:id/approve', protect, async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    visitor.status = 'checked-in';
    visitor.checkInTime = new Date();
    visitor.approvedBy = req.user._id;
    await visitor.save();
    await Log.create({ action: 'CHECK_IN', performedBy: req.user._id, performedByName: req.user.name, targetVisitor: visitor._id, visitorName: visitor.fullName });
    console.log(`[HOST NOTIFICATION] ${visitor.host} — ${visitor.fullName} from ${visitor.company || 'N/A'} has arrived.`);
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Guard: Decline entry
router.patch('/:id/decline', protect, async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    visitor.status = 'declined';
    await visitor.save();
    await Log.create({ action: 'DECLINED', performedBy: req.user._id, performedByName: req.user.name, targetVisitor: visitor._id, visitorName: visitor.fullName });
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Guard: Check-out
router.patch('/:id/checkout', protect, async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    visitor.status = 'checked-out';
    visitor.checkOutTime = new Date();
    await visitor.save();
    await Log.create({ action: 'CHECK_OUT', performedBy: req.user._id, performedByName: req.user.name, targetVisitor: visitor._id, visitorName: visitor.fullName });
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Guard: Flag visitor
router.patch('/:id/flag', protect, async (req, res) => {
  const visitor = await Visitor.findByIdAndUpdate(req.params.id, { status: 'flagged' }, { new: true });
  await Log.create({ action: 'FLAGGED', performedBy: req.user._id, performedByName: req.user.name, targetVisitor: visitor._id, visitorName: visitor.fullName });
  res.json(visitor);
});

// Guard/Admin: Verify visitor identity
router.patch('/:id/verify', protect, async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    await Log.create({ action: 'VERIFIED', performedBy: req.user._id, performedByName: req.user.name, targetVisitor: visitor._id, visitorName: visitor.fullName });
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Guard: Emergency roster
router.get('/inside', protect, async (req, res) => {
  const visitors = await Visitor.find({ status: 'checked-in' }).sort({ checkInTime: -1 });
  res.json(visitors);
});

// Admin: Stats today
router.get('/stats/today', protect, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const [total, inside, pending, declined, checkedOut, flagged] = await Promise.all([
    Visitor.countDocuments({ date: today }),
    Visitor.countDocuments({ status: 'checked-in' }),
    Visitor.countDocuments({ status: 'pending' }),
    Visitor.countDocuments({ status: 'declined' }),
    Visitor.countDocuments({ status: 'checked-out' }),
    Visitor.countDocuments({ status: 'flagged' }),
  ]);
  res.json({ total, inside, pending, declined, checkedOut, flagged });
});

// Admin: Hourly traffic (supports ?date= param)
router.get('/stats/hourly', protect, async (req, res) => {
  const day = req.query.date || new Date().toISOString().split('T')[0];
  const visitors = await Visitor.find({ date: day, checkInTime: { $exists: true } });
  const fmt = (h) => { const ampm = h < 12 ? 'AM' : 'PM'; const h12 = h % 12 || 12; return `${h12}${ampm}`; };
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: fmt(i), count: 0 }));
  visitors.forEach(v => { hours[new Date(v.checkInTime).getHours()].count++; });
  res.json(hours.filter(h => h.count > 0 || (parseInt(h.hour) >= 8 && parseInt(h.hour) <= 20)));
});

// Admin: Day-wise stats for a selected date
router.get('/stats/day', protect, async (req, res) => {
  const day = req.query.date || new Date().toISOString().split('T')[0];
  const [total, checkedIn, checkedOut, declined, flagged, pending] = await Promise.all([
    Visitor.countDocuments({ date: day }),
    Visitor.countDocuments({ date: day, status: 'checked-in' }),
    Visitor.countDocuments({ date: day, status: 'checked-out' }),
    Visitor.countDocuments({ date: day, status: 'declined' }),
    Visitor.countDocuments({ date: day, status: 'flagged' }),
    Visitor.countDocuments({ date: day, status: 'pending' }),
  ]);
  // avg visit duration for that day
  const completed = await Visitor.find({ date: day, checkInTime: { $exists: true }, checkOutTime: { $exists: true } });
  const avgMins = completed.length
    ? Math.round(completed.reduce((s, v) => s + (new Date(v.checkOutTime) - new Date(v.checkInTime)), 0) / completed.length / 60000)
    : null;
  // top purpose
  const purposeAgg = await Visitor.aggregate([
    { $match: { date: day } },
    { $group: { _id: '$purpose', count: { $sum: 1 } } },
    { $sort: { count: -1 } }, { $limit: 1 },
  ]);
  // first and last check-in
  const first = await Visitor.findOne({ date: day, checkInTime: { $exists: true } }).sort({ checkInTime: 1 });
  const last = await Visitor.findOne({ date: day, checkInTime: { $exists: true } }).sort({ checkInTime: -1 });
  const fmt12 = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
  res.json({
    date: day, total, checkedIn, checkedOut, declined, flagged, pending,
    avgMins, topPurpose: purposeAgg[0]?._id || null,
    firstEntry: fmt12(first?.checkInTime), lastEntry: fmt12(last?.checkInTime),
  });
});

// Admin: Monthly trend (last 6 months)
router.get('/stats/monthly', protect, async (req, res) => {
  const results = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const count = await Visitor.countDocuments({ date: { $regex: `^${prefix}` } });
    results.push({ month: d.toLocaleString('default', { month: 'short', year: '2-digit' }), count });
  }
  res.json(results);
});

// Admin: Purpose breakdown
router.get('/stats/purposes', protect, async (req, res) => {
  const purposes = await Visitor.aggregate([
    { $group: { _id: '$purpose', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 6 },
  ]);
  res.json(purposes.map(p => ({ purpose: p._id || 'Other', count: p.count })));
});

// Admin: Export CSV
router.get('/export/csv', protect, adminOnly, async (req, res) => {
  try {
    const { status, date, month, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (date) query.date = date;
    if (month) query.date = { $regex: `^${month}` };
    if (search) query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
    const visitors = await Visitor.find(query).sort({ createdAt: -1 }).limit(5000);
    const header = 'Name,Phone,Email,Company,Purpose,Host,Status,Date,Check-In,Check-Out\n';
    const rows = visitors.map(v => [
      v.fullName, v.phone, v.email || '', v.company || '',
      v.purpose, v.host || '', v.status, v.date,
      v.checkInTime ? new Date(v.checkInTime).toLocaleString() : '',
      v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : '',
    ].map(f => `"${String(f).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="visitors-${Date.now()}.csv"`);
    res.send(header + rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Manually set check-in / check-out time + status
router.patch('/:id/set-times', protect, adminOnly, async (req, res) => {
  try {
    const { checkInTime, checkOutTime, status } = req.body;
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    if (checkInTime !== undefined) visitor.checkInTime = checkInTime ? new Date(checkInTime) : null;
    if (checkOutTime !== undefined) visitor.checkOutTime = checkOutTime ? new Date(checkOutTime) : null;
    if (status) visitor.status = status;
    await visitor.save();
    await Log.create({ action: 'MANUAL_TIME_EDIT', performedBy: req.user._id, performedByName: req.user.name, targetVisitor: visitor._id, visitorName: visitor.fullName, details: `Status: ${visitor.status}` });
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Get all visitors with filters + pagination
router.get('/', protect, async (req, res) => {
  try {
    const { status, date, month, purpose, search, page = 1, limit = 15 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (date) query.date = date;
    if (month) query.date = { $regex: `^${month}` };
    if (purpose) query.purpose = purpose;
    if (search) query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
      { host: { $regex: search, $options: 'i' } },
    ];
    const total = await Visitor.countDocuments(query);
    const visitors = await Visitor.find(query).sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit)).limit(Number(limit));
    res.json({ visitors, total, pages: Math.ceil(total / Number(limit)), page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Delete visitor
router.delete('/:id', protect, adminOnly, async (req, res) => {
  await Visitor.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
