import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const inp = "w-full px-4 py-3 rounded-xl bg-white/60 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all text-slate-800 placeholder-slate-400 text-sm";
const lbl = "block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide";

const PURPOSES = [
  'Regular Employment', 'Contract Work', 'Trainee', 'Internship', 'Vendor / Supplier',
  'IT / Technical Support', 'Training & Development', 'Project Deployment',
  'Audit / Compliance', 'Consultant', 'Other',
];

const DURATION_OPTS = [
  { id: '1m', label: '1 Month', icon: '📅' },
  { id: '6m', label: '6 Months', icon: '🗓️' },
  { id: 'custom', label: 'Custom', icon: '✏️' },
];

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function requestGeo() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

function validate(form, photo, geoStatus) {
  if (!form.fullName.trim()) return 'Full name is required';
  if (!/^\+?[\d\s\-]{8,15}$/.test(form.phone)) return 'Enter a valid phone number';
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address';
  if (!form.address.trim()) return 'Address is required';
  if (!form.purpose) return 'Please select a purpose';
  if (form.purpose === 'Trainee' && !form.traineeEmployeeId?.trim()) return 'Employee ID is required for Trainee role';
  if (!form.startDate) return 'Start date is required';
  if (!form.endDate) return 'End date is required';
  if (form.endDate < form.startDate) return 'End date must be after start date';
  if (!photo) return 'Please take a photo — it is required for pass approval';
  if (geoStatus !== 'granted') return 'Location is required — please allow and capture your location';
  return null;
}

export default function PassForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', company: '', address: '',
    purpose: '', host: '', startDate: '', endDate: '', traineeEmployeeId: '',
  });
  const [duration, setDuration] = useState('1m');
  const [photo, setPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | requesting | granted | denied
  const [geoCoords, setGeoCoords] = useState(null);
  const [geoAddress, setGeoAddress] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];

  // Auto-set dates when duration preset changes
  useEffect(() => {
    if (!today) return;
    if (duration === '1m') setForm(f => ({ ...f, startDate: today, endDate: addMonths(today, 1) }));
    else if (duration === '6m') setForm(f => ({ ...f, startDate: today, endDate: addMonths(today, 6) }));
    else setForm(f => ({ ...f, startDate: today, endDate: '' }));
  }, [duration]);

  const askGeo = async () => {
    setGeoStatus('requesting');
    const coords = await requestGeo();
    if (!coords) { setGeoStatus('denied'); toast.error('Location access denied'); return; }
    setGeoCoords(coords);
    setGeoStatus('granted');
    // Reverse geocode for display
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`);
      const data = await res.json();
      setGeoAddress(data.display_name?.split(',').slice(0, 3).join(', ') || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
    } catch {
      setGeoAddress(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
    }
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

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
    const err = validate(form, photo, geoStatus);
    if (err) { toast.error(err); return; }
    setLoading(true);
    try {
      const payload = {
        ...form, photoUrl: photo,
        ...(geoCoords && { geoLocation: { lat: geoCoords.lat, lng: geoCoords.lng, accuracy: geoCoords.accuracy } }),
      };
      await api.post('/passes/register', payload);
      setSubmitted(true);
      toast.success('Pass request submitted!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  const durationDays = form.startDate && form.endDate
    ? Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1
    : null;

  // ── Success screen ────────────────────────────────────────
  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-8 text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
          <span className="text-4xl">🎫</span>
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Request Submitted!</h2>
        <p className="text-white/50 text-sm mb-5">You'll receive an email once approved with a link to set your password.</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-2">
          <p className="text-sm text-white/70"><span className="font-bold text-white">Name:</span> {form.fullName}</p>
          <p className="text-sm text-white/70"><span className="font-bold text-white">Email:</span> {form.email}</p>
          <p className="text-sm text-white/70"><span className="font-bold text-white">Tenure:</span> {form.startDate} → {form.endDate}</p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/')}
          className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 text-sm">
          Back to Home
        </motion.button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-7 my-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <button onClick={() => navigate('/')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors text-sm flex-shrink-0">←</button>
          <div>
            <h2 className="text-xl font-black text-white">Monthly Access Pass</h2>
            <p className="text-white/40 text-xs mt-0.5">Submit your details — admin will review and approve</p>
          </div>
        </div>

        {/* Required fields note */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-400/20 mb-5">
          <span className="text-orange-400 text-xs">★</span>
          <p className="text-xs text-orange-300/80">Fields marked with <span className="text-orange-400 font-bold">*</span> are required. Photo and location are mandatory for pass approval.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Full Name <span className="text-orange-400">*</span></label>
              <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="John Doe" className={inp} />
            </div>
            <div>
              <label className={lbl}>Phone <span className="text-orange-400">*</span></label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" className={inp} />
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

          {/* Purpose + Host */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Purpose <span className="text-orange-400">*</span></label>
              <select name="purpose" value={form.purpose} onChange={handleChange} className={inp}>
                <option value="">Select purpose</option>
                {PURPOSES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Host / Contact Person</label>
              <input name="host" value={form.host} onChange={handleChange} placeholder="Employee name" className={inp} />
            </div>
          </div>

          {/* Trainee Employee ID — shown only when purpose is Trainee */}
          {form.purpose === 'Trainee' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-blue-500/10 border border-blue-400/30 rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🪪</span>
                <div>
                  <p className="text-sm font-bold text-blue-200">Trainee Role Detected</p>
                  <p className="text-xs text-blue-300/70">Please provide the Employee ID of your reporting manager or supervisor</p>
                </div>
              </div>
              <label className={lbl}>Supervisor / Reporting Employee ID <span className="text-orange-400">*</span></label>
              <input
                name="traineeEmployeeId"
                value={form.traineeEmployeeId}
                onChange={handleChange}
                placeholder="e.g. EMP-00123"
                className={inp}
                autoComplete="off"
              />
            </motion.div>
          )}

          {/* Address */}
          <div>
            <label className={lbl}>Address <span className="text-orange-400">*</span></label>
            <input name="address" value={form.address} onChange={handleChange} placeholder="Your full residential address" className={inp} />
          </div>

          {/* Duration selector */}
          <div>
            <label className={lbl}>Pass Duration <span className="text-orange-400">*</span></label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {DURATION_OPTS.map(opt => (
                <button key={opt.id} type="button" onClick={() => setDuration(opt.id)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                    duration === opt.id
                      ? 'bg-orange-500/20 border-orange-400/60 text-orange-300'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80'
                  }`}>
                  <span className="text-lg">{opt.icon}</span>
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Date fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Start Date</label>
                <input type="date" name="startDate" value={form.startDate} onChange={handleChange}
                  min={today} readOnly={duration !== 'custom'}
                  className={`${inp} ${duration !== 'custom' ? 'opacity-60 cursor-not-allowed' : ''}`} />
              </div>
              <div>
                <label className={lbl}>End Date</label>
                <input type="date" name="endDate" value={form.endDate} onChange={handleChange}
                  min={form.startDate || today} readOnly={duration !== 'custom'}
                  className={`${inp} ${duration !== 'custom' ? 'opacity-60 cursor-not-allowed' : ''}`} />
              </div>
            </div>
            {durationDays && (
              <p className="text-xs text-orange-300/80 mt-1.5 font-medium">
                📅 {durationDays} day{durationDays !== 1 ? 's' : ''} · {form.startDate} → {form.endDate}
              </p>
            )}
          </div>

          {/* Pinpoint Location */}
          <div>
            <label className={lbl}>Current Location <span className="text-orange-400">*</span></label>
            {geoStatus === 'idle' && (
              <button type="button" onClick={askGeo}
                className="w-full py-4 border-2 border-dashed border-orange-400/40 rounded-xl flex items-center justify-center gap-3 bg-orange-500/5 hover:bg-orange-500/10 transition-colors text-orange-300/70 hover:text-orange-300">
                <span className="text-xl">📍</span>
                <div className="text-left">
                  <p className="text-sm font-bold">Capture My Location</p>
                  <p className="text-xs opacity-70">Required for pass verification</p>
                </div>
              </button>
            )}
            {geoStatus === 'requesting' && (
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-blue-500/10 border border-blue-400/20 text-blue-300 text-sm">
                <div className="w-4 h-4 border-2 border-blue-400/40 border-t-blue-400 rounded-full animate-spin flex-shrink-0" />
                <div>
                  <p className="font-semibold">Getting your location…</p>
                  <p className="text-xs opacity-70">Please allow location access in your browser</p>
                </div>
              </div>
            )}
            {geoStatus === 'denied' && (
              <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-400/20 text-red-300 text-sm">
                <div>
                  <p className="font-semibold">⚠️ Location access denied</p>
                  <p className="text-xs opacity-70">Allow location in browser settings and retry</p>
                </div>
                <button type="button" onClick={askGeo} className="text-xs font-bold underline ml-3 flex-shrink-0">Retry</button>
              </div>
            )}
            {geoStatus === 'granted' && (
              <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-green-500/10 border border-green-400/20 text-green-300 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex-shrink-0 text-base">✅</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs">Location captured</p>
                    <p className="text-xs opacity-70 truncate">{geoAddress || `${geoCoords?.lat?.toFixed(5)}, ${geoCoords?.lng?.toFixed(5)}`}</p>
                  </div>
                </div>
                <button type="button" onClick={askGeo} className="text-xs font-bold text-green-400 underline flex-shrink-0 ml-2">Refresh</button>
              </div>
            )}
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
                className="w-full py-5 border-2 border-dashed border-orange-400/40 rounded-2xl flex items-center justify-center gap-3 bg-orange-500/5 hover:bg-orange-500/10 transition-colors text-orange-300/70 hover:text-orange-300">
                <span className="text-2xl">📸</span>
                <div className="text-left">
                  <p className="text-sm font-bold">Take a Photo</p>
                  <p className="text-xs opacity-70">Required for pass identification</p>
                </div>
              </button>
            )}
          </div>

          {/* Submit */}
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/30 disabled:opacity-60 text-sm mt-2">
            {loading
              ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</span>
              : 'Submit Pass Request 🎫'
            }
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
