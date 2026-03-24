const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  reason: String,
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedByName: String,
}, { timestamps: true });

module.exports = mongoose.model('Blacklist', blacklistSchema);
