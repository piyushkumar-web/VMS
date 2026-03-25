import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/axios';

export default function SetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [passInfo, setPassInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    api.get(`/passes/verify/${token}`)
      .then(({ data }) => { setPassInfo(data); setLoading(false); })
      .catch(() => { setInvalid(true); setLoading(false); });
  }, [token]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    setSubmitting(true);
    try {
      await api.post(`/passes/verify/${token}/set-password`, { password: form.password });
      setDone(true);
      toast.success('Password set! You can now log in.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set password');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (invalid) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 text-center max-w-md w-full">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-white mb-2">Invalid or Expired Link</h2>
        <p className="text-white/50 text-sm mb-6">This verification link has expired or is invalid. Please contact admin.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-orange-500 text-white font-bold rounded-xl">Go to Login</button>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 text-center max-w-md w-full">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-white mb-2">Password Set Successfully!</h2>
        <p className="text-white/60 text-sm mb-6">You can now log in to the Pass Portal using your email and password.</p>
        <button onClick={() => navigate('/pass/login')}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30">
          Go to Pass Login →
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
            <span className="text-white text-3xl">🎫</span>
          </div>
          <h1 className="text-2xl font-black text-white">Set Your Password</h1>
          <p className="text-white/50 text-sm mt-1">Pass Portal — Grazitti Interactive</p>
        </div>

        {/* Pass info */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 space-y-1.5">
          <p className="text-white font-bold">{passInfo?.fullName}</p>
          <p className="text-white/50 text-xs">{passInfo?.email}</p>
          <p className="text-white/60 text-xs">Valid: {passInfo?.startDate} → {passInfo?.endDate}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-2">New Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 6 characters" required
                className="w-full px-4 py-3 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-lg">{showPw ? '🙈' : '👁️'}</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-2">Confirm Password</label>
            <input type="password" value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
              placeholder="Re-enter password" required
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm" />
          </div>
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 disabled:opacity-60 mt-2">
            {submitting ? 'Setting password...' : 'Set Password & Activate Pass →'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
