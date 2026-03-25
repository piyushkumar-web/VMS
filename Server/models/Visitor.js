const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const visitorSchema = new mongoose.Schema({
  visitorId: { type: String, default: uuidv4, unique: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  company: String,
  address: String,
  purpose: { type: String, required: true },
  host: String,
  photoUrl: String,
  idProofUrl: String,
  signature: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'checked-in', 'checked-out', 'declined', 'flagged'],
    default: 'pending'
  },
  qrCode: String,
  qrExpiry: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  checkInTime: Date,
  checkOutTime: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isBlacklisted: { type: Boolean, default: false },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  geoLocation: {
    lat: Number,
    lng: Number,
    accuracy: Number,
    lastVerified: Date,
    isInsidePremises: Boolean,
  },
}, { timestamps: true });

module.exports = mongoose.model('Visitor', visitorSchema);
