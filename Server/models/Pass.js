const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const passSchema = new mongoose.Schema({
  passId: { type: String, default: uuidv4, unique: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  company: String,
  address: String,
  purpose: { type: String, required: true },
  host: String,
  photoUrl: String,
  signature: String,
  // tenure
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  // status
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined', 'expired'],
    default: 'pending',
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  declineReason: String,
  // email verification & password setup
  verifyToken: { type: String, unique: true, sparse: true },
  verifyTokenExpiry: Date,
  isVerified: { type: Boolean, default: false },
  passwordHash: String,
  // geo
  geoLocation: {
    lat: Number,
    lng: Number,
    accuracy: Number,
    lastVerified: Date,
    isInsidePremises: Boolean,
  },
  // daily check-in/out log
  attendanceLogs: [{
    date: String,
    checkIn: Date,
    checkOut: Date,
    checkInGeo: { lat: Number, lng: Number, isInsidePremises: Boolean },
    checkOutGeo: { lat: Number, lng: Number, isInsidePremises: Boolean },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Pass', passSchema);
