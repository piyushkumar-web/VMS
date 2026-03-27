import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const inp = "w-full px-4 py-3 rounded-xl bg-white/60 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all text-slate-800 placeholder-slate-400 text-sm";
const lbl = "block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide";
const PURPOSES = ['Meeting', 'Interview', 'Delivery', 'Maintenance', 'Personal', 'Other'];

function validate(form, photo) {
  if (!form.fullName.trim()) return 'Full name is required';
  if (!/^\+?[\d\s\-]{8,15}$/.test(form.phone)) return 'Enter a valid phone number';
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email address is required';
  if (!form.address.trim()) return 'Address is required';
  if (!form.purpose) return 'Please select a purpose';
  if (!photo) return 'Please take a photo before submitting';
  return null;
}

export default function EntryForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', company: '', address: '', purpose: '', host: '' });
  const [photo, setPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const openCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { toast.error('Camera access denied'); setShowCamera(false); }
  };

  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setPhoto(canvas.toDataURL('image/jpeg', 0.8));
    streamRef.current?.getTracks().forEach(t => t.stop());
    setShowCamera(false);
    toast.success('Photo captured!');
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setShowCamera(false);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const err = validate(form, photo);
    if (err) { toast.error(err); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/visitors/register', { ...form, photoUrl: photo });
      setResult(data);
      toast.success('Check-in registered!');
      setTimeout(() => autoDownloadQR(data), 600);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  const autoDownloadQR = (data) => {
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 520;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 400, 520);
    ctx.fillStyle = '#f97316'; ctx.fillRect(0, 0, 400, 70);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('VISITOR PASS', 200, 35);
    ctx.font = '13px sans-serif'; ctx.fillText('Visitor Management System', 200, 56);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 75, 85, 250, 250);
      ctx.fillStyle = '#1e293b'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(data.visitor.fullName, 200, 365);
      ctx.font = '13px sans-serif'; ctx.fillStyle = '#64748b';
      ctx.fillText(data.visitor.purpose + (data.visitor.host ? ` · Host: ${data.visitor.host}` : ''), 200, 388);
      ctx.fillText(`Date: ${today}`, 200, 410);
      ctx.font = '11px monospace'; ctx.fillStyle = '#94a3b8';
      ctx.fillText(`ID: ${data.visitor.visitorId}`, 200, 435);
      ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 455, 400, 65);
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px sans-serif';
      ctx.fillText('Present this pass to the security guard at entry', 200, 480);
      ctx.fillText(`Generated on ${today}`, 200, 498);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `visitor-pass-${data.visitor.fullName.replace(/\s+/g, '-')}-${today}.png`;
      a.click();
    };
    img.src = data.qrCode;
  };

  // ── Success screen ────────────────────────────────────────
  if (result) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-8 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
          <span className="text-4xl">✅</span>
        </motion.div>
        <h2 className="text-2xl font-black text-white mb-1">You're Registered!</h2>
        <p className="text-white/50 text-sm mb-5">Show this QR code to the security guard</p>
        <div className="bg-white rounded-2xl p-4 shadow-inner inline-block mb-4">
          <img src={result.qrCode} alt="QR Code" className="w-52 h-52 mx-auto" />
        </div>
        <p className="text-xs text-white/40 mb-1">QR downloaded automatically ⬇</p>
        <p className="text-sm font-semibold text-white/80 mb-6">{result.visitor.fullName} · {result.visitor.purpose}</p>
        <div className="flex gap-3">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => autoDownloadQR(result)}
            className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-500/30">
            ⬇ Re-download
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/')}
            className="flex-1 py-3 bg-white/10 text-white font-bold rounded-xl text-sm border border-white/20 hover:bg-white/20 transition-colors">
            ← Home
          </motion.button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-7">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors text-sm">←</button>
          <div>
            <h2 className="text-xl font-black text-white">Day Pass Check-In</h2>
            <p className="text-white/40 text-xs">Fill in your details to get a visitor pass</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Full Name <span className="text-orange-400">*</span></label>
              <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="John Doe"
                className={`${inp} ${errors.fullName ? 'border-red-400' : ''}`} />
              {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <label className={lbl}>Phone <span className="text-orange-400">*</span></label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210"
                className={`${inp} ${errors.phone ? 'border-red-400' : ''}`} />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Email + Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Email <span className="text-orange-400">*</span></label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className={inp} />
            </div>
            <div>
              <label className={lbl}>Company</label>
              <input name="company" value={form.company} onChange={handleChange} placeholder="Company / Organization" className={inp} />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className={lbl}>Address <span className="text-orange-400">*</span></label>
            <input name="address" value={form.address} onChange={handleChange} placeholder="Your full address" className={inp} />
          </div>

          {/* Purpose + Host */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Purpose <span className="text-orange-400">*</span></label>
              <select name="purpose" value={form.purpose} onChange={handleChange}
                className={`${inp} ${errors.purpose ? 'border-red-400' : ''}`}>
                <option value="">Select purpose</option>
                {PURPOSES.map(p => <option key={p}>{p}</option>)}
              </select>
              {errors.purpose && <p className="text-red-400 text-xs mt-1">{errors.purpose}</p>}
            </div>
            <div>
              <label className={lbl}>Host / Person to Meet</label>
              <input name="host" value={form.host} onChange={handleChange} placeholder="Employee name" className={inp} />
            </div>
          </div>

          {/* Photo */}
          <div>
            <label className={lbl}>Photo <span className="text-orange-400">*</span></label>
            {showCamera ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-orange-400/50">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl" />
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                  <button type="button" onClick={capturePhoto}
                    className="px-5 py-2 bg-orange-500 text-white font-bold rounded-full shadow-lg text-sm">📸 Capture</button>
                  <button type="button" onClick={stopCamera}
                    className="px-5 py-2 bg-black/50 text-white font-bold rounded-full text-sm">✕ Cancel</button>
                </div>
              </div>
            ) : photo ? (
              <div className="relative">
                <img src={photo} alt="Captured" className="w-full h-40 object-cover rounded-2xl border-2 border-green-400/50" />
                <button type="button" onClick={openCamera}
                  className="absolute top-2 right-2 px-3 py-1 bg-black/60 text-white text-xs font-semibold rounded-lg">Retake</button>
              </div>
            ) : (
              <button type="button" onClick={openCamera}
                className="w-full py-6 border-2 border-dashed border-orange-400/40 rounded-2xl flex items-center justify-center gap-3 bg-orange-500/5 hover:bg-orange-500/10 transition-colors text-orange-300/70 hover:text-orange-300">
                <span className="text-2xl">📸</span>
                <div className="text-left">
                  <p className="text-sm font-bold">Take a Photo</p>
                  <p className="text-xs opacity-70">Required for visitor identification</p>
                </div>
              </button>
            )}
          </div>

          {/* Submit */}
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/30 disabled:opacity-60 text-sm mt-2">
            {loading
              ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Registering...</span>
              : 'Get Visitor Pass 🎫'
            }
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
