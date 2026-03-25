// const express = require('express');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const crypto = require('crypto');
// const nodemailer = require('nodemailer');
// const Pass = require('../models/Pass');
// const { protect, adminOnly } = require('../middleware/auth');
// const router = express.Router();

// const OFFICE = { lat: 30.6942, lng: 76.8606, radiusMeters: 200 };

// function haversineMeters(lat1, lng1, lat2, lng2) {
//   const R = 6371000;
//   const toRad = d => d * Math.PI / 180;
//   const dLat = toRad(lat2 - lat1);
//   const dLng = toRad(lng2 - lng1);
//   const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

// const dns = require('dns');
// dns.setDefaultResultOrder('ipv4first');

// function createTransporter() {
//   const user = process.env.MAIL_USER || '';
//   const pass = process.env.MAIL_PASS || '';
//   if (!user || !pass || user.includes('your_gmail')) return null;
//   return nodemailer.createTransport({
//     host: 'smtp.gmail.com', port: 587, secure: false,
//     auth: { user, pass },
//     tls: { rejectUnauthorized: false },
//     family: 4,
//   });
// }

// async function sendApprovalMail(pass, verifyUrl) {


  



//   let transporter = createTransporter();
//   console.log("transporter", transporter);
//   if (!transporter) {
//           const testAccount = await nodemailer.createTestAccount();
//           console.log("testAccount", testAccount);
//           const transporter = nodemailer.createTransport({
//         host: env.SMTP_HOST,
//         port: Number(env.SMTP_PORT),
//         secure: Number(env.SMTP_PORT) === 465, // ✅ correct logic
//         auth: {
//           user: process.env.SMTP_USER,
//           pass: process.env.SMTP_PASS,
//         },
//       });

//     // transporter = nodemailer.createTransport({
      
//     //   host: 'smtp.gmail.com', port: 587, secure: false,
//     //   auth: { user: testAccount.user, pass: testAccount.pass },
//     // });
//     console.log('nodemailer err', transporter);
//     console.log('[MAIL] Ethereal account:', testAccount.user);
//   }
//   const info = await transporter.sendMail({
//     from: `"VMS - Grazitti Interactive" <${process.env.MAIL_USER || 'vms@grazitti.com'}>`,
//     to: pass.email,
//     subject: 'Your Access Pass Has Been Approved - Set Your Password',
//     html: `
//       <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
//         <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:28px 32px">
//           <h1 style="color:#fff;margin:0;font-size:22px">Grazitti Interactive</h1>
//           <p style="color:#fed7aa;margin:6px 0 0;font-size:13px">Visitor Management System</p>
//         </div>
//         <div style="padding:32px">
//           <h2 style="color:#1e293b;margin:0 0 8px">Your Pass is Approved!</h2>
//           <p style="color:#64748b;margin:0 0 20px">Hi <strong>${pass.fullName}</strong>, your access pass request has been approved.</p>
//           <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
//             <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Pass ID</td><td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:13px">${pass.passId}</td></tr>
//             <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Valid From</td><td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:13px">${pass.startDate}</td></tr>
//             <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Valid Until</td><td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:13px">${pass.endDate}</td></tr>
//             <tr><td style="padding:8px 0;color:#94a3b8;font-size:13px">Purpose</td><td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:13px">${pass.purpose}</td></tr>
//           </table>
//           <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px">
//             Verify and Set Password
//           </a>
//           <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">This link expires in 24 hours.</p>
//         </div>
//       </div>
//     `,
//   });
//   const preview = nodemailer.getTestMessageUrl(info);
//   if (preview) console.log('[MAIL] Preview:', preview);
//   else console.log('[MAIL] Sent to', pass.email);
//   return info;
// }

// // Admin: Test mail
// router.post('/test-mail', protect, adminOnly, async (req, res) => {
//   try {
//     const fakePas = { fullName: 'Test User', email: process.env.MAIL_USER, passId: 'TEST-001', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], purpose: 'Mail Config Test' };
//     await sendApprovalMail(fakePas, `${process.env.CLIENT_URL}/pass/verify/test-token`);
//     res.json({ ok: true, message: `Test email sent to ${process.env.MAIL_USER}` });
//   } catch (err) { res.status(500).json({ ok: false, message: err.message }); }
// });

// // Admin: Force reset password
// router.patch('/admin-reset-password', protect, adminOnly, async (req, res) => {
//   try {
//     const { email, newPassword } = req.body;
//     if (!email || !newPassword) return res.status(400).json({ message: 'email and newPassword required' });
//     const pass = await Pass.findOne({ email: email.trim() }) || await Pass.findOne({ email: email.trim().toLowerCase() });
//     if (!pass) return res.status(404).json({ message: 'No pass found for this email' });
//     pass.passwordHash = await bcrypt.hash(newPassword, 10);
//     pass.isVerified = true;
//     pass.verifyToken = undefined;
//     pass.verifyTokenExpiry = undefined;
//     await pass.save();
//     res.json({ ok: true, message: `Password reset for ${pass.email}` });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Public: Submit pass request
// router.post('/register', async (req, res) => {
//   try {
//     const { geoLocation, ...rest } = req.body;
//     const body = { ...rest };
//     if (geoLocation?.lat && geoLocation?.lng) {
//       const dist = haversineMeters(geoLocation.lat, geoLocation.lng, OFFICE.lat, OFFICE.lng);
//       body.geoLocation = { ...geoLocation, isInsidePremises: dist <= OFFICE.radiusMeters, lastVerified: new Date() };
//     }
//     const pass = await Pass.create(body);
//     res.status(201).json({ pass });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Admin: Get all attendance logs across all passes (with pagination + filters)
// router.get('/attendance', protect, adminOnly, async (req, res) => {
//   try {
//     const { search, date, status, page = 1, limit = 15 } = req.query;
//     const passQuery = {};
//     if (search) passQuery.$or = [
//       { fullName: { $regex: search, $options: 'i' } },
//       { email: { $regex: search, $options: 'i' } },
//     ];
//     const allPasses = await Pass.find(passQuery).select('fullName email passId attendanceLogs');
//     let logs = [];
//     allPasses.forEach(p => {
//       (p.attendanceLogs || []).forEach(l => {
//         const logStatus = l.checkOut ? 'complete' : l.checkIn ? 'checked-in' : 'absent';
//         logs.push({
//           passId: p.passId,
//           fullName: p.fullName,
//           email: p.email,
//           date: l.date,
//           checkIn: l.checkIn || null,
//           checkOut: l.checkOut || null,
//           checkInGeo: l.checkInGeo || null,
//           checkOutGeo: l.checkOutGeo || null,
//           durationMins: l.checkIn && l.checkOut ? Math.round((new Date(l.checkOut) - new Date(l.checkIn)) / 60000) : null,
//           logStatus,
//         });
//       });
//     });
//     if (date) logs = logs.filter(l => l.date === date);
//     if (status) logs = logs.filter(l => l.logStatus === status);
//     logs.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
//     const total = logs.length;
//     const pg = Number(page), lm = Number(limit);
//     res.json({ logs: logs.slice((pg - 1) * lm, pg * lm), total, pages: Math.ceil(total / lm) || 1, page: pg });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Admin: Get all passes with filters + pagination
// router.get('/', protect, adminOnly, async (req, res) => {
//   try {
//     const { status, search, page = 1, limit = 15, startDate, endDate } = req.query;
//     const query = {};
//     if (status) query.status = status;
//     if (startDate) query.startDate = { $gte: startDate };
//     if (endDate) query.endDate = { $lte: endDate };
//     if (search) query.$or = [
//       { fullName: { $regex: search, $options: 'i' } },
//       { email: { $regex: search, $options: 'i' } },
//       { phone: { $regex: search, $options: 'i' } },
//       { company: { $regex: search, $options: 'i' } },
//     ];
//     const total = await Pass.countDocuments(query);
//     const passes = await Pass.find(query).populate('approvedBy', 'name').sort({ createdAt: -1 }).skip((page - 1) * Number(limit)).limit(Number(limit));
//     res.json({ passes, total, pages: Math.ceil(total / Number(limit)), page: Number(page) });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Public: Verify token
// router.get('/verify/:token', async (req, res) => {
//   try {
//     const pass = await Pass.findOne({ verifyToken: req.params.token, verifyTokenExpiry: { $gt: new Date() } });
//     if (!pass) return res.status(400).json({ message: 'Invalid or expired verification link' });
//     res.json({ passId: pass.passId, fullName: pass.fullName, email: pass.email, startDate: pass.startDate, endDate: pass.endDate });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Public: Set password after email verify
// router.post('/verify/:token/set-password', async (req, res) => {
//   try {
//     const { password } = req.body;
//     if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
//     const pass = await Pass.findOne({ verifyToken: req.params.token, verifyTokenExpiry: { $gt: new Date() } });
//     if (!pass) return res.status(400).json({ message: 'Invalid or expired link' });
//     pass.passwordHash = await bcrypt.hash(password, 10);
//     pass.isVerified = true;
//     pass.verifyToken = undefined;
//     pass.verifyTokenExpiry = undefined;
//     await pass.save();
//     res.json({ message: 'Password set successfully. You can now log in.' });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Public: Reset password (self-service)
// router.post('/reset-password', async (req, res) => {
//   try {
//     const { email, newPassword } = req.body;
//     if (!email || !newPassword) return res.status(400).json({ message: 'Email and new password are required' });
//     if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
//     const pass = await Pass.findOne({ email: email.trim() }) || await Pass.findOne({ email: email.trim().toLowerCase() });
//     if (!pass) return res.status(404).json({ message: 'No pass found for this email address' });
//     if (pass.status !== 'approved') return res.status(403).json({ message: `Your pass is ${pass.status} and cannot be accessed` });
//     pass.passwordHash = await bcrypt.hash(newPassword, 10);
//     pass.isVerified = true;
//     pass.verifyToken = undefined;
//     pass.verifyTokenExpiry = undefined;
//     await pass.save();
//     res.json({ ok: true, message: 'Password reset successfully. You can now log in.' });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Public: Debug
// router.get('/debug/:email', async (req, res) => {
//   try {
//     const pass = await Pass.findOne({ email: req.params.email }).select('email status isVerified passwordHash startDate endDate fullName passId');
//     if (!pass) return res.status(404).json({ message: 'No pass found for this email' });
//     res.json({ email: pass.email, fullName: pass.fullName, passId: pass.passId, status: pass.status, isVerified: pass.isVerified, hasPassword: !!pass.passwordHash, startDate: pass.startDate, endDate: pass.endDate });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Public: Pass user login
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
//     const pass = await Pass.findOne({ email: email.trim().toLowerCase() }) || await Pass.findOne({ email: email.trim() });
//     if (!pass) return res.status(401).json({ message: 'No pass found for this email address' });
//     if (pass.status !== 'approved') return res.status(401).json({ message: `Your pass is ${pass.status}. Only approved passes can log in.` });
//     if (!pass.isVerified) return res.status(401).json({ message: 'Email not verified yet. Please check your email and click the verification link.' });
//     if (!pass.passwordHash) return res.status(401).json({ message: 'Password not set. Please use the link sent to your email.' });
//     const ok = await bcrypt.compare(password, pass.passwordHash);
//     if (!ok) return res.status(401).json({ message: 'Incorrect password' });
//     const today = new Date().toISOString().split('T')[0];
//     if (today > pass.endDate) return res.status(403).json({ message: `Your pass expired on ${pass.endDate}` });
//     const token = jwt.sign({ passId: pass._id, type: 'pass' }, process.env.JWT_SECRET, { expiresIn: '1d' });
//     res.json({ token, pass: { id: pass._id, passId: pass.passId, fullName: pass.fullName, email: pass.email, startDate: pass.startDate, endDate: pass.endDate, photoUrl: pass.photoUrl, purpose: pass.purpose, host: pass.host } });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Pass user middleware
// const passAuth = async (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1];
//   if (!token) return res.status(401).json({ message: 'Not authorized' });
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     if (decoded.type !== 'pass') return res.status(401).json({ message: 'Invalid token type' });
//     req.pass = await Pass.findById(decoded.passId);
//     if (!req.pass) return res.status(401).json({ message: 'Pass not found' });
//     next();
//   } catch { res.status(401).json({ message: 'Invalid token' }); }
// };

// // Pass user: Get own pass info
// router.get('/me', passAuth, async (req, res) => { res.json(req.pass); });

// // Pass user: Check-in
// router.post('/checkin', passAuth, async (req, res) => {
//   try {
//     const { lat, lng, accuracy } = req.body;
//     if (!lat || !lng) return res.status(400).json({ message: 'Location required for check-in' });
//     const dist = haversineMeters(lat, lng, OFFICE.lat, OFFICE.lng);
//     const isInsidePremises = dist <= OFFICE.radiusMeters;
//     if (!isInsidePremises) return res.status(403).json({ message: `You must be inside office premises to check in. You are ${Math.round(dist)}m away.` });
//     const today = new Date().toISOString().split('T')[0];
//     const pass = req.pass;
//     if (today < pass.startDate || today > pass.endDate) return res.status(403).json({ message: 'Your pass is not valid today' });
//     const existing = pass.attendanceLogs.find(l => l.date === today);
//     if (existing?.checkIn && !existing?.checkOut) return res.status(400).json({ message: 'Already checked in today' });
//     if (existing?.checkOut) return res.status(400).json({ message: 'Already completed attendance for today' });
//     pass.attendanceLogs.push({ date: today, checkIn: new Date(), checkInGeo: { lat, lng, isInsidePremises } });
//     pass.geoLocation = { lat, lng, accuracy, lastVerified: new Date(), isInsidePremises };
//     await pass.save();
//     res.json({ message: 'Checked in successfully', checkIn: new Date(), isInsidePremises });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Pass user: Check-out
// router.post('/checkout', passAuth, async (req, res) => {
//   try {
//     const { lat, lng, accuracy } = req.body;
//     if (!lat || !lng) return res.status(400).json({ message: 'Location required for check-out' });
//     const dist = haversineMeters(lat, lng, OFFICE.lat, OFFICE.lng);
//     const isInsidePremises = dist <= OFFICE.radiusMeters;
//     const today = new Date().toISOString().split('T')[0];
//     const pass = req.pass;
//     const log = pass.attendanceLogs.find(l => l.date === today && l.checkIn && !l.checkOut);
//     if (!log) return res.status(400).json({ message: 'No active check-in found for today' });
//     log.checkOut = new Date();
//     log.checkOutGeo = { lat, lng, isInsidePremises };
//     pass.geoLocation = { lat, lng, accuracy, lastVerified: new Date(), isInsidePremises };
//     await pass.save();
//     res.json({ message: 'Checked out successfully', checkOut: log.checkOut, durationMins: Math.round((log.checkOut - log.checkIn) / 60000) });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Pass user: Update geo location
// router.patch('/location', passAuth, async (req, res) => {
//   try {
//     const { lat, lng, accuracy } = req.body;
//     const dist = haversineMeters(lat, lng, OFFICE.lat, OFFICE.lng);
//     const isInsidePremises = dist <= OFFICE.radiusMeters;
//     req.pass.geoLocation = { lat, lng, accuracy, lastVerified: new Date(), isInsidePremises };
//     await req.pass.save();
//     res.json({ ok: true, isInsidePremises, distanceMeters: Math.round(dist) });
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Admin: Approve pass + send email  (/:id routes AFTER all named routes)
// router.patch('/:id/approve', protect, adminOnly, async (req, res) => {
//   try {
//     const pass = await Pass.findById(req.params.id);
//     if (!pass) return res.status(404).json({ message: 'Pass not found' });
//     const { startDate, endDate } = req.body;
//     if (startDate) pass.startDate = startDate;
//     if (endDate) pass.endDate = endDate;
//     pass.status = 'approved';
//     pass.approvedBy = req.user._id;
//     pass.approvedAt = new Date();
//     const token = crypto.randomBytes(32).toString('hex');
//     pass.verifyToken = token;
//     pass.verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
//     await pass.save();
//     const verifyUrl = `${process.env.CLIENT_URL}/pass/verify/${token}`;
//     try {
//       await sendApprovalMail(pass, verifyUrl);
//       res.json({ ...pass.toObject(), mailSent: true });
//     } catch (mailErr) {
//       console.error('[MAIL ERROR]', mailErr.message);
//       res.json({ ...pass.toObject(), mailSent: false, mailError: mailErr.message });
//     }
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Admin: Decline pass
// router.patch('/:id/decline', protect, adminOnly, async (req, res) => {
//   try {
//     const pass = await Pass.findById(req.params.id);
//     if (!pass) return res.status(404).json({ message: 'Pass not found' });
//     pass.status = 'declined';
//     pass.declineReason = req.body.reason || '';
//     await pass.save();
//     res.json(pass);
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Admin: Update tenure
// router.patch('/:id/tenure', protect, adminOnly, async (req, res) => {
//   try {
//     const { startDate, endDate } = req.body;
//     const pass = await Pass.findById(req.params.id);
//     if (!pass) return res.status(404).json({ message: 'Pass not found' });
//     if (startDate) pass.startDate = startDate;
//     if (endDate) pass.endDate = endDate;
//     await pass.save();
//     res.json(pass);
//   } catch (err) { res.status(500).json({ message: err.message }); }
// });

// // Admin: Delete pass
// router.delete('/:id', protect, adminOnly, async (req, res) => {
//   await Pass.findByIdAndDelete(req.params.id);
//   res.json({ message: 'Deleted' });
// });

// module.exports = router;





const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Pass = require('../models/Pass');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

const OFFICE = { lat: 30.6942, lng: 76.8606, radiusMeters: 200 };

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// Improved SMTP transporter creation with better error handling
async function createTransporter() {
  // Check for production SMTP configuration first
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465, // SSL for port 465, TLS for others
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false, // Helps with self-signed certificates
        },
        connectionTimeout: 10000, // 10 seconds timeout
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
      
      // Verify SMTP connection
      await transporter.verify();
      console.log('[SMTP] Production SMTP configured successfully');
      return transporter;
    } catch (error) {
      console.error('[SMTP] Production SMTP verification failed:', error.message);
      // Fall through to Gmail or ethereal
    }
  }
  
  // Fallback to Gmail SMTP
  const gmailUser = process.env.GMAIL_USER || process.env.MAIL_USER;
  const gmailPass = process.env.GMAIL_PASS || process.env.MAIL_PASS;
  
  if (gmailUser && gmailPass && !gmailUser.includes('your_gmail')) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
      
      await transporter.verify();
      console.log('[SMTP] Gmail SMTP configured successfully');
      return transporter;
    } catch (error) {
      console.error('[SMTP] Gmail SMTP verification failed:', error.message);
    }
  }
  
  // Final fallback to Ethereal for testing
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    
    console.log('[SMTP] Ethereal test account created:', testAccount.user);
    console.log('[SMTP] Preview URL will be available for test emails');
    return transporter;
  } catch (error) {
    console.error('[SMTP] Failed to create any transporter:', error.message);
    return null;
  }
}

async function sendApprovalMail(pass, verifyUrl) {
  let transporter = await createTransporter();
  
  if (!transporter) {
    throw new Error('Failed to create email transporter. Please check SMTP configuration.');
  }
  
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || `"VMS - Grazitti Interactive" <${process.env.MAIL_USER || 'vms@grazitti.com'}>`,
    to: pass.email,
    subject: 'Your Access Pass Has Been Approved - Set Your Password',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:28px 32px">
          <h1 style="color:#fff;margin:0;font-size:22px">Grazitti Interactive</h1>
          <p style="color:#fed7aa;margin:6px 0 0;font-size:13px">Visitor Management System</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#1e293b;margin:0 0 8px">Your Pass is Approved!</h2>
          <p style="color:#64748b;margin:0 0 20px">Hi <strong>${pass.fullName}</strong>, your access pass request has been approved.</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr>
              <td style="padding:8px 0;color:#94a3b8;font-size:13px">Pass ID</td>
              <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:13px">${pass.passId}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94a3b8;font-size:13px">Valid From</td>
              <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:13px">${pass.startDate}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94a3b8;font-size:13px">Valid Until</td>
              <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:13px">${pass.endDate}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94a3b8;font-size:13px">Purpose</td>
              <td style="padding:8px 0;font-weight:600;color:#1e293b;font-size:13px">${pass.purpose}</td>
            </tr>
          </table>
          <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px">
            Verify and Set Password
          </a>
          <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">This link expires in 24 hours.</p>
        </div>
      </div>
    `,
  });
  
  // Log preview URL for Ethereal emails
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) {
    console.log('[MAIL] Preview URL:', preview);
  } else {
    console.log('[MAIL] Email sent to:', pass.email);
  }
  
  return info;
}

// Admin: Test mail
router.post('/test-mail', protect, adminOnly, async (req, res) => {
  try {
    const testPass = { 
      fullName: 'Test User', 
      email: process.env.MAIL_USER || process.env.GMAIL_USER || 'test@example.com', 
      passId: 'TEST-001', 
      startDate: new Date().toISOString().split('T')[0], 
      endDate: new Date().toISOString().split('T')[0], 
      purpose: 'Mail Config Test' 
    };
    
    await sendApprovalMail(testPass, `${process.env.CLIENT_URL}/pass/verify/test-token`);
    res.json({ ok: true, message: `Test email sent to ${testPass.email}` });
  } catch (err) { 
    console.error('[TEST-MAIL ERROR]', err);
    res.status(500).json({ ok: false, message: err.message }); 
  }
});

// Admin: Force reset password
router.patch('/admin-reset-password', protect, adminOnly, async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ message: 'email and newPassword required' });
    const pass = await Pass.findOne({ email: email.trim() }) || await Pass.findOne({ email: email.trim().toLowerCase() });
    if (!pass) return res.status(404).json({ message: 'No pass found for this email' });
    pass.passwordHash = await bcrypt.hash(newPassword, 10);
    pass.isVerified = true;
    pass.verifyToken = undefined;
    pass.verifyTokenExpiry = undefined;
    await pass.save();
    res.json({ ok: true, message: `Password reset for ${pass.email}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Public: Submit pass request
router.post('/register', async (req, res) => {
  try {
    const { geoLocation, ...rest } = req.body;
    const body = { ...rest };
    if (geoLocation?.lat && geoLocation?.lng) {
      const dist = haversineMeters(geoLocation.lat, geoLocation.lng, OFFICE.lat, OFFICE.lng);
      body.geoLocation = { ...geoLocation, isInsidePremises: dist <= OFFICE.radiusMeters, lastVerified: new Date() };
    }
    const pass = await Pass.create(body);
    res.status(201).json({ pass });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: Get all attendance logs across all passes (with pagination + filters)
router.get('/attendance', protect, adminOnly, async (req, res) => {
  try {
    const { search, date, status, page = 1, limit = 15 } = req.query;
    const passQuery = {};
    if (search) passQuery.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const allPasses = await Pass.find(passQuery).select('fullName email passId attendanceLogs');
    let logs = [];
    allPasses.forEach(p => {
      (p.attendanceLogs || []).forEach(l => {
        const logStatus = l.checkOut ? 'complete' : l.checkIn ? 'checked-in' : 'absent';
        logs.push({
          passId: p.passId,
          fullName: p.fullName,
          email: p.email,
          date: l.date,
          checkIn: l.checkIn || null,
          checkOut: l.checkOut || null,
          checkInGeo: l.checkInGeo || null,
          checkOutGeo: l.checkOutGeo || null,
          durationMins: l.checkIn && l.checkOut ? Math.round((new Date(l.checkOut) - new Date(l.checkIn)) / 60000) : null,
          logStatus,
        });
      });
    });
    if (date) logs = logs.filter(l => l.date === date);
    if (status) logs = logs.filter(l => l.logStatus === status);
    logs.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    const total = logs.length;
    const pg = Number(page), lm = Number(limit);
    res.json({ logs: logs.slice((pg - 1) * lm, pg * lm), total, pages: Math.ceil(total / lm) || 1, page: pg });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: Get all passes with filters + pagination
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 15, startDate, endDate } = req.query;
    const query = {};
    if (status) query.status = status;
    if (startDate) query.startDate = { $gte: startDate };
    if (endDate) query.endDate = { $lte: endDate };
    if (search) query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
    ];
    const total = await Pass.countDocuments(query);
    const passes = await Pass.find(query).populate('approvedBy', 'name').sort({ createdAt: -1 }).skip((page - 1) * Number(limit)).limit(Number(limit));
    res.json({ passes, total, pages: Math.ceil(total / Number(limit)), page: Number(page) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Public: Verify token
router.get('/verify/:token', async (req, res) => {
  try {
    const pass = await Pass.findOne({ verifyToken: req.params.token, verifyTokenExpiry: { $gt: new Date() } });
    if (!pass) return res.status(400).json({ message: 'Invalid or expired verification link' });
    res.json({ passId: pass.passId, fullName: pass.fullName, email: pass.email, startDate: pass.startDate, endDate: pass.endDate });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Public: Set password after email verify
router.post('/verify/:token/set-password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const pass = await Pass.findOne({ verifyToken: req.params.token, verifyTokenExpiry: { $gt: new Date() } });
    if (!pass) return res.status(400).json({ message: 'Invalid or expired link' });
    pass.passwordHash = await bcrypt.hash(password, 10);
    pass.isVerified = true;
    pass.verifyToken = undefined;
    pass.verifyTokenExpiry = undefined;
    await pass.save();
    res.json({ message: 'Password set successfully. You can now log in.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Public: Reset password (self-service)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ message: 'Email and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const pass = await Pass.findOne({ email: email.trim() }) || await Pass.findOne({ email: email.trim().toLowerCase() });
    if (!pass) return res.status(404).json({ message: 'No pass found for this email address' });
    if (pass.status !== 'approved') return res.status(403).json({ message: `Your pass is ${pass.status} and cannot be accessed` });
    pass.passwordHash = await bcrypt.hash(newPassword, 10);
    pass.isVerified = true;
    pass.verifyToken = undefined;
    pass.verifyTokenExpiry = undefined;
    await pass.save();
    res.json({ ok: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Public: Debug
router.get('/debug/:email', async (req, res) => {
  try {
    const pass = await Pass.findOne({ email: req.params.email }).select('email status isVerified passwordHash startDate endDate fullName passId');
    if (!pass) return res.status(404).json({ message: 'No pass found for this email' });
    res.json({ email: pass.email, fullName: pass.fullName, passId: pass.passId, status: pass.status, isVerified: pass.isVerified, hasPassword: !!pass.passwordHash, startDate: pass.startDate, endDate: pass.endDate });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Public: Pass user login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const pass = await Pass.findOne({ email: email.trim().toLowerCase() }) || await Pass.findOne({ email: email.trim() });
    if (!pass) return res.status(401).json({ message: 'No pass found for this email address' });
    if (pass.status !== 'approved') return res.status(401).json({ message: `Your pass is ${pass.status}. Only approved passes can log in.` });
    if (!pass.isVerified) return res.status(401).json({ message: 'Email not verified yet. Please check your email and click the verification link.' });
    if (!pass.passwordHash) return res.status(401).json({ message: 'Password not set. Please use the link sent to your email.' });
    const ok = await bcrypt.compare(password, pass.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Incorrect password' });
    const today = new Date().toISOString().split('T')[0];
    if (today > pass.endDate) return res.status(403).json({ message: `Your pass expired on ${pass.endDate}` });
    const token = jwt.sign({ passId: pass._id, type: 'pass' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, pass: { id: pass._id, passId: pass.passId, fullName: pass.fullName, email: pass.email, startDate: pass.startDate, endDate: pass.endDate, photoUrl: pass.photoUrl, purpose: pass.purpose, host: pass.host } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Pass user middleware
const passAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'pass') return res.status(401).json({ message: 'Invalid token type' });
    req.pass = await Pass.findById(decoded.passId);
    if (!req.pass) return res.status(401).json({ message: 'Pass not found' });
    next();
  } catch { res.status(401).json({ message: 'Invalid token' }); }
};

// Pass user: Get own pass info
router.get('/me', passAuth, async (req, res) => { res.json(req.pass); });

// Pass user: Check-in
router.post('/checkin', passAuth, async (req, res) => {
  try {
    const { lat, lng, accuracy } = req.body;
    if (!lat || !lng) return res.status(400).json({ message: 'Location required for check-in' });
    const dist = haversineMeters(lat, lng, OFFICE.lat, OFFICE.lng);
    const isInsidePremises = dist <= OFFICE.radiusMeters;
    if (!isInsidePremises) return res.status(403).json({ message: `You must be inside office premises to check in. You are ${Math.round(dist)}m away.` });
    const today = new Date().toISOString().split('T')[0];
    const pass = req.pass;
    if (today < pass.startDate || today > pass.endDate) return res.status(403).json({ message: 'Your pass is not valid today' });
    const existing = pass.attendanceLogs.find(l => l.date === today);
    if (existing?.checkIn && !existing?.checkOut) return res.status(400).json({ message: 'Already checked in today' });
    if (existing?.checkOut) return res.status(400).json({ message: 'Already completed attendance for today' });
    pass.attendanceLogs.push({ date: today, checkIn: new Date(), checkInGeo: { lat, lng, isInsidePremises } });
    pass.geoLocation = { lat, lng, accuracy, lastVerified: new Date(), isInsidePremises };
    await pass.save();
    res.json({ message: 'Checked in successfully', checkIn: new Date(), isInsidePremises });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Pass user: Check-out
router.post('/checkout', passAuth, async (req, res) => {
  try {
    const { lat, lng, accuracy } = req.body;
    if (!lat || !lng) return res.status(400).json({ message: 'Location required for check-out' });
    const dist = haversineMeters(lat, lng, OFFICE.lat, OFFICE.lng);
    const isInsidePremises = dist <= OFFICE.radiusMeters;
    const today = new Date().toISOString().split('T')[0];
    const pass = req.pass;
    const log = pass.attendanceLogs.find(l => l.date === today && l.checkIn && !l.checkOut);
    if (!log) return res.status(400).json({ message: 'No active check-in found for today' });
    log.checkOut = new Date();
    log.checkOutGeo = { lat, lng, isInsidePremises };
    pass.geoLocation = { lat, lng, accuracy, lastVerified: new Date(), isInsidePremises };
    await pass.save();
    res.json({ message: 'Checked out successfully', checkOut: log.checkOut, durationMins: Math.round((log.checkOut - log.checkIn) / 60000) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Pass user: Update geo location
router.patch('/location', passAuth, async (req, res) => {
  try {
    const { lat, lng, accuracy } = req.body;
    const dist = haversineMeters(lat, lng, OFFICE.lat, OFFICE.lng);
    const isInsidePremises = dist <= OFFICE.radiusMeters;
    req.pass.geoLocation = { lat, lng, accuracy, lastVerified: new Date(), isInsidePremises };
    await req.pass.save();
    res.json({ ok: true, isInsidePremises, distanceMeters: Math.round(dist) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: Approve pass + send email  (/:id routes AFTER all named routes)
router.patch('/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const pass = await Pass.findById(req.params.id);
    if (!pass) return res.status(404).json({ message: 'Pass not found' });
    const { startDate, endDate } = req.body;
    if (startDate) pass.startDate = startDate;
    if (endDate) pass.endDate = endDate;
    pass.status = 'approved';
    pass.approvedBy = req.user._id;
    pass.approvedAt = new Date();
    const token = crypto.randomBytes(32).toString('hex');
    pass.verifyToken = token;
    pass.verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pass.save();
    const verifyUrl = `${process.env.CLIENT_URL}/pass/verify/${token}`;
    try {
      await sendApprovalMail(pass, verifyUrl);
      res.json({ ...pass.toObject(), mailSent: true });
    } catch (mailErr) {
      console.error('[MAIL ERROR]', mailErr.message);
      res.json({ ...pass.toObject(), mailSent: false, mailError: mailErr.message });
    }
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: Decline pass
router.patch('/:id/decline', protect, adminOnly, async (req, res) => {
  try {
    const pass = await Pass.findById(req.params.id);
    if (!pass) return res.status(404).json({ message: 'Pass not found' });
    pass.status = 'declined';
    pass.declineReason = req.body.reason || '';
    await pass.save();
    res.json(pass);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: Update tenure
router.patch('/:id/tenure', protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const pass = await Pass.findById(req.params.id);
    if (!pass) return res.status(404).json({ message: 'Pass not found' });
    if (startDate) pass.startDate = startDate;
    if (endDate) pass.endDate = endDate;
    await pass.save();
    res.json(pass);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Admin: Delete pass
router.delete('/:id', protect, adminOnly, async (req, res) => {
  await Pass.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;