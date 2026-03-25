import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SignatureCanvas from 'react-signature-canvas';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const inputCls = "w-full px-4 py-3 rounded-xl bg-white/60 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all text-slate-800 placeholder-slate-400";
const labelCls = "block text-sm font-semibold text-slate-700 mb-2";
const PURPOSES = ['Regular Work', 'Project Access', 'Training', 'Internship', 'Vendor Access', 'Other'];
const OFFICE = { lat: 30.6942, lng: 76.8606, radiusMeters: 200 };

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function requestGeo() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      err => { console.warn('Geo:', err.message); resolve(null); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

export default function PassForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', company: '', address: '',
    purpose: '', host: '', startDate: '', endDate: '',
  });
  const [photo, setPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [geoStatus, setGeoStatus] = useState('idle');
  const [geoCoords, setGeoCoords] = useState(null);
  const [isInsidePremises, setIsInsidePremises] = useState(null);
  const [distanceM, setDistanceM] = useState(null);

  const sigRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => { askGeo(); }, []);

  const askGeo = async () => {
    setGeoStatus('requesting');
    const coords = await requestGeo();
    if (!coords) { setGeoStatus('denied'); return; }
    setGeoStatus('granted');
    setGeoCoords(coords);
    const dist = haversineMeters(coords.lat, coords.lng, OFFICE.lat, OFFICE.lng);
    setDistanceM(Math.round(dist));
    setIsInsidePremises(dist <= OFFICE.radiusMeters);
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

  const handleSubmit = async () => {
    if (!form.fullName || !form.phone || !form.email || !form.purpose || !form.startDate || !form.endDate) {
      toast.error('Please fill all required fields'); return;
    }
    if (form.endDate < form.startDate) { toast.error('End date must be after start date'); return; }
    let coords = geoCoords;
    if (!coords) { coords = await requestGeo(); if (coords) setGeoCoords(coords); }
    setLoading(true);
    try {
      const signature = sigRef.current?.isEmpty() ? null : sigRef.current?.toDataURL();
      const payload = {
        ...form, photoUrl: photo, signature,
        ...(coords && { geoLocation: { lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy } }),
      };
      await api.post('/passes/register', payload);
      setSubmitted(true);
      toast.success('Pass request submitted!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  const GeoBanner = () => {
    if (geoStatus === 'idle') return null;
    if (geoStatus === 'requesting') return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700 font-medium">
        <div className="w-4 h-4 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
        Requesting location…
      </div>
    );
    if (geoStatus === 'denied') return (
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm">
        <span className="text-red-700 font-medium">⚠️ Location denied — allow in browser settings</span>
        <button onClick={askGeo} className="text-xs font-bold text-red-600 underline">Retry</button>
      </div>
    );
    return (
      <div className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${isInsidePremises ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
        <span>{isInsidePremises ? '✅ Inside office premises' : `⚠️ Outside office (${distanceM}m away)`} · {distanceM}m from office</span>
      </div>
    );
  };

  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange-50 flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl p-10 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🎫</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Pass Request Submitted!</h2>
        <p className="text-slate-500 mb-6">Your request is under review. You'll receive an email once approved with a link to set your password.</p>
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6 text-left space-y-1">
          <p className="text-sm text-slate-600"><span className="font-semibold">Name:</span> {form.fullName}</p>
          <p className="text-sm text-slate-600"><span className="font-semibold">Email:</span> {form.email}</p>
          <p className="text-sm text-slate-600"><span className="font-semibold">Tenure:</span> {form.startDate} → {form.endDate}</p>
        </div>
        <button onClick={() => navigate('/')} className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200">
          Back to Home
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange-50 flex items-center justify-center p-6">
      <div className="fixed top-0 -left-20 w-96 h-96 bg-orange-200 rounded-full blur-3xl opacity-25" />
      <div className="fixed bottom-0 -right-20 w-96 h-96 bg-slate-300 rounded-full blur-3xl opacity-20" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl p-8 md:p-12">

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
            <span className="text-white text-2xl">🎫</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Request Access Pass</h2>
          <p className="text-slate-500 mt-1">Fill in your details to request a recurring access pass</p>
        </div>

        <div className="mb-6"><GeoBanner /></div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'bg-slate-100 text-slate-400'}`}>{s}</div>
              {s < 2 && <div className={`w-16 h-1 rounded-full transition-all ${step > s ? 'bg-orange-500' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label className={labelCls}>Full Name *</label><input name="fullName" value={form.fullName} onChange={handleChange} placeholder="John Doe" className={inputCls} /></div>
                <div><label className={labelCls}>Phone *</label><input name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" className={inputCls} /></div>
                <div><label className={labelCls}>Email *</label><input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className={inputCls} /></div>
                <div><label className={labelCls}>Company</label><input name="company" value={form.company} onChange={handleChange} placeholder="Company name" className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Address</label><textarea name="address" value={form.address} onChange={handleChange} rows={2} placeholder="Your address..." className={inputCls} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Purpose *</label>
                  <select name="purpose" value={form.purpose} onChange={handleChange} className={inputCls}>
                    <option value="">Select purpose</option>
                    {PURPOSES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Host / Contact Person</label><input name="host" value={form.host} onChange={handleChange} placeholder="Employee name..." className={inputCls} /></div>
              </div>
              {/* Tenure */}
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                <p className="text-sm font-bold text-orange-700 mb-3">📅 Pass Tenure</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Start Date *</label>
                    <input type="date" name="startDate" value={form.startDate} onChange={handleChange} min={new Date().toISOString().split('T')[0]} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>End Date *</label>
                    <input type="date" name="endDate" value={form.endDate} onChange={handleChange} min={form.startDate || new Date().toISOString().split('T')[0]} className={inputCls} />
                  </div>
                </div>
                {form.startDate && form.endDate && (
                  <p className="text-xs text-orange-600 mt-2 font-medium">
                    Duration: {Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1} days
                  </p>
                )}
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
                if (!form.fullName || !form.phone || !form.email || !form.purpose || !form.startDate || !form.endDate) { toast.error('Fill all required fields'); return; }
                setStep(2);
              }} className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200">
                Continue →
              </motion.button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                <label className={labelCls}>Live Photo</label>
                {showCamera ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-orange-300">
                    <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl" />
                    <button onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-orange-500 text-white font-bold rounded-full shadow-lg">📸 Capture</button>
                  </div>
                ) : photo ? (
                  <div className="relative">
                    <img src={photo} alt="Captured" className="w-full rounded-2xl border-2 border-green-300" />
                    <button onClick={openCamera} className="absolute top-2 right-2 px-3 py-1 bg-white/80 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">Retake</button>
                  </div>
                ) : (
                  <motion.button whileTap={{ scale: 0.98 }} onClick={openCamera}
                    className="w-full py-10 border-2 border-dashed border-orange-300 rounded-2xl flex flex-col items-center gap-2 bg-orange-50/50 hover:bg-orange-50 transition-colors">
                    <span className="text-4xl">📸</span>
                    <p className="font-semibold text-orange-700">Open Camera</p>
                    <p className="text-xs text-orange-400">Optional — tap to take photo</p>
                  </motion.button>
                )}
              </div>
              <div>
                <label className={labelCls}>Digital Signature</label>
                <p className="text-xs text-slate-400 mb-2">By signing, you agree to the access pass terms and conditions.</p>
                <div className="border-2 border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <SignatureCanvas ref={sigRef} penColor="#1e293b" canvasProps={{ className: 'w-full h-32', style: { width: '100%', height: '128px' } }} />
                </div>
                <button onClick={() => sigRef.current?.clear()} className="text-xs text-orange-500 mt-1 hover:underline">Clear</button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">← Back</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200 disabled:opacity-50">
                  {loading ? 'Submitting...' : 'Submit Request 🎫'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
