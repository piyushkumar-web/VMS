const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByName: String,
  targetVisitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor' },
  visitorName: String,
  details: String,
  ip: String,
}, { timestamps: true });

module.exports = mongoose.model('Log', logSchema);
