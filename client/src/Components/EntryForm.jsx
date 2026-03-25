import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SignatureCanvas from 'react-signature-canvas';
import toast from 'react-hot-toast';
import api from '../api/axios';

const inputCls = "w-full px-4 py-3 rounded-xl bg-white/60 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all text-slate-800 placeholder-slate-400";
const labelCls = "block text-sm font-semibold text-slate-700 mb-2";
const PURPOSES = ['Meeting', 'Interview', 'Delivery', 'Maintenance', 'Personal', 'Other'];

// Grazitti Interactive, Plot 19, Sector 22, Panchkula
const OFFICE = { lat: 30.6942, lng: 76.8606, radiusMeters: 200 };

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns { lat, lng, accuracy } or null. Shows browser permission prompt.
function requestGeo() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      err => {
        console.warn('Geo error:', err.message);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

export default function EntryForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', company: '', address: '', purpose: '', host: '' });
  const [photo, setPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // geo states
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | requesting | granted | denied
  const [geoCoords, setGeoCoords] = useState(null);   // { lat, lng, accuracy }
  const [isInsidePremises, setIsInsidePremises] = useState(null); // null | true | false
  const [distanceM, setDistanceM] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const sigRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const geoIntervalRef = useRef(null);
  const visitorIdRef = useRef(null);

  // ── Request geo on mount ──────────────────────────────────
  useEffect(() => {
    askGeo();
    return () => clearInterval(geoIntervalRef.current);
  }, []);

  const askGeo = async () => {
    setGeoStatus('requesting');
    const coords = await requestGeo();
    if (!coords) {
      setGeoStatus('denied');
      toast.error('Location access denied. Please allow location in browser settings.', { duration: 5000 });
      return;
    }
    setGeoStatus('granted');
    setGeoCoords(coords);
    const dist = haversineMeters(coords.lat, coords.lng, OFFICE.lat, OFFICE.lng);
    setDistanceM(Math.round(dist));
    setIsInsidePremises(dist <= OFFICE.radiusMeters);
    setLastChecked(new Date());
  };

  // ── 15-min geo re-check loop ──────────────────────────────
  const startGeoLoop = (mongoId) => {
    visitorIdRef.current = mongoId;
    geoIntervalRef.current = setInterval(async () => {
      const coords = await requestGeo();
      if (!coords) return;
      setGeoCoords(coords);
      const dist = haversineMeters(coords.lat, coords.lng, OFFICE.lat, OFFICE.lng);
      const inside = dist <= OFFICE.radiusMeters;
      setDistanceM(Math.round(dist));
      setIsInsidePremises(inside);
      setLastChecked(new Date());

      // Update backend
      try {
        await api.patch(`/visitors/${visitorIdRef.current}/location`, {
          lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy,
        });
      } catch { /* silent */ }

      // Alert visitor if outside
      if (!inside) {
        toast.error(`⚠️ You appear to be outside office premises (${Math.round(dist)}m away). Please return to Grazitti Interactive.`, { duration: 8000 });
      } else {
        toast.success('📍 Location verified — you are inside office premises.', { duration: 3000 });
      }
    }, 15 * 60 * 1000);
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const openCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast.error('Camera access denied');
      setShowCamera(false);
    }
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
    if (!form.fullName || !form.phone || !form.purpose) {
      toast.error('Please fill all required fields');
      return;
    }
    // Re-fetch fresh coords at submit time
    let coords = geoCoords;
    if (geoStatus === 'denied' || !coords) {
      // Try once more
      const fresh = await requestGeo();
      if (fresh) {
        coords = fresh;
        setGeoCoords(fresh);
        setGeoStatus('granted');
        const dist = haversineMeters(fresh.lat, fresh.lng, OFFICE.lat, OFFICE.lng);
        setDistanceM(Math.round(dist));
        setIsInsidePremises(dist <= OFFICE.radiusMeters);
      }
    }

    setLoading(true);
    try {
      const signature = sigRef.current?.isEmpty() ? null : sigRef.current?.toDataURL();
      const payload = {
        ...form, photoUrl: photo, signature,
        ...(coords && { geoLocation: { lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy, lastVerified: new Date() } }),
      };
      const { data } = await api.post('/visitors/register', payload);
      setResult(data);
      setStep(3);
      toast.success('Check-in registered successfully!');
      setTimeout(() => autoDownloadQR(data), 600);
      startGeoLoop(data.visitor._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
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

  // ── Geo status banner ─────────────────────────────────────
  const GeoBanner = () => {
    if (geoStatus === 'idle') return null;
    if (geoStatus === 'requesting') return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700 font-medium">
        <div className="w-4 h-4 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
        Requesting location permission…
      </div>
    );
    if (geoStatus === 'denied') return (
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm">
        <span className="text-red-700 font-medium">⚠️ Location access denied — please allow in browser settings</span>
        <button onClick={askGeo} className="text-xs font-bold text-red-600 underline whitespace-nowrap">Retry</button>
      </div>
    );
    // granted
    return (
      <div className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${
        isInsidePremises === true ? 'bg-green-50 border-green-200 text-green-700' :
        isInsidePremises === false ? 'bg-orange-50 border-orange-200 text-orange-700' :
        'bg-blue-50 border-blue-100 text-blue-700'
      }`}>
        <span>
          {isInsidePremises === true && '✅ Inside office premises'}
          {isInsidePremises === false && `⚠️ Outside office premises (${distanceM}m away)`}
          {isInsidePremises === null && '📍 Location captured'}
          {distanceM !== null && isInsidePremises !== null && ` · ${distanceM}m from office`}
        </span>
        {lastChecked && (
          <span className="text-xs opacity-70 whitespace-nowrap">
            {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    );
  };

  // ── Success screen ────────────────────────────────────────
  if (step === 3 && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange-50 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl p-10 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✅</span>
          </motion.div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">You're Registered!</h2>
          <p className="text-slate-500 mb-4">Show this QR code to the security guard</p>

          {/* Live geo status on success screen */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 ${
            isInsidePremises === true ? 'bg-green-100 text-green-700' :
            isInsidePremises === false ? 'bg-orange-100 text-orange-700' :
            'bg-slate-100 text-slate-500'
          }`}>
            {isInsidePremises === true && '📍 Inside premises · tracking every 15 min'}
            {isInsidePremises === false && `⚠️ Outside premises (${distanceM}m) · tracking every 15 min`}
            {isInsidePremises === null && '📍 Location tracking active'}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-inner border border-slate-100 inline-block mb-4">
            <img src={result.qrCode} alt="QR Code" className="w-56 h-56 mx-auto" />
          </div>

          <p className="text-xs text-slate-400 mb-1">QR downloaded automatically ⬇</p>
          <p className="text-xs text-slate-400 mb-2">Visitor ID: <span className="font-mono text-slate-600">{result.visitor.visitorId}</span></p>
          <p className="text-sm font-semibold text-slate-700 mb-6">{result.visitor.fullName} · {result.visitor.purpose}</p>

          <div className="flex gap-3">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => autoDownloadQR(result)}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200">
              ⬇ Re-download QR
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
              clearInterval(geoIntervalRef.current);
              setStep(1); setForm({ fullName: '', phone: '', email: '', company: '', address: '', purpose: '', host: '' });
              setPhoto(null); setResult(null); setGeoStatus('idle'); setGeoCoords(null);
              setIsInsidePremises(null); setDistanceM(null); setLastChecked(null);
              askGeo();
            }} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
              New Entry
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange-50 flex items-center justify-center p-6">
      <div className="fixed top-0 -left-20 w-96 h-96 bg-orange-200 rounded-full blur-3xl opacity-25" />
      <div className="fixed bottom-0 -right-20 w-96 h-96 bg-slate-300 rounded-full blur-3xl opacity-20" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl p-8 md:p-12">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
            <span className="text-white text-2xl">🏢</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Visitor Check-In</h2>
          <p className="text-slate-500 mt-1">Please fill in your details to proceed</p>
        </div>

        {/* Geo banner — always visible */}
        <div className="mb-6">
          <GeoBanner />
        </div>

        {/* Step Indicator */}
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
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="John Doe" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone Number *</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email Address</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Company / Organization</label>
                  <input name="company" value={form.company} onChange={handleChange} placeholder="Google / Freelance" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Address</label>
                <textarea name="address" value={form.address} onChange={handleChange} rows={2} placeholder="Your address..." className={inputCls} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Purpose of Visit *</label>
                  <select name="purpose" value={form.purpose} onChange={handleChange} className={inputCls}>
                    <option value="">Select purpose</option>
                    {PURPOSES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Host / Employee to Meet</label>
                  <input name="host" value={form.host} onChange={handleChange} placeholder="Employee name..." className={inputCls} />
                </div>
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
                if (!form.fullName || !form.phone || !form.purpose) { toast.error('Fill required fields'); return; }
                setStep(2);
              }} className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all">
                Continue →
              </motion.button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              {/* Live Photo */}
              <div>
                <label className={labelCls}>Live Photo *</label>
                {showCamera ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-orange-300">
                    <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl" />
                    <button onClick={capturePhoto}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-orange-500 text-white font-bold rounded-full shadow-lg">
                      📸 Capture
                    </button>
                  </div>
                ) : photo ? (
                  <div className="relative">
                    <img src={photo} alt="Captured" className="w-full rounded-2xl border-2 border-green-300" />
                    <button onClick={openCamera} className="absolute top-2 right-2 px-3 py-1 bg-white/80 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">Retake</button>
                  </div>
                ) : (
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={openCamera}
                    className="w-full py-10 border-2 border-dashed border-orange-300 rounded-2xl flex flex-col items-center gap-2 bg-orange-50/50 hover:bg-orange-50 transition-colors">
                    <span className="text-4xl">📸</span>
                    <p className="font-semibold text-orange-700">Open Camera</p>
                    <p className="text-xs text-orange-400">Tap to take your photo</p>
                  </motion.button>
                )}
              </div>

              {/* Digital Signature */}
              <div>
                <label className={labelCls}>Digital Signature (NDA Agreement)</label>
                <p className="text-xs text-slate-400 mb-2">By signing, you agree to our visitor policy and NDA terms.</p>
                <div className="border-2 border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <SignatureCanvas ref={sigRef} penColor="#1e293b"
                    canvasProps={{ className: 'w-full h-32', style: { width: '100%', height: '128px' } }} />
                </div>
                <button onClick={() => sigRef.current?.clear()} className="text-xs text-orange-500 mt-1 hover:underline">Clear signature</button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">← Back</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={loading || !photo}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200 disabled:opacity-50 transition-all">
                  {loading ? 'Submitting...' : 'Check In Now ✓'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
