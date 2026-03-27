import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../api/axios';

const TABS = [
  { id: 'visitor', label: 'Day Pass', icon: '🏢', desc: 'One-time visitor check-in' },
  { id: 'pass', label: 'Monthly Pass', icon: '🎫', desc: 'Recurring access pass' },
  { id: 'login', label: 'Staff Login', icon: '🔐', desc: 'Admin & Guard portal' },
];

export default function Landing() {
  const [tab, setTab] = useState('visitor');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/guard'} replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-5" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-orange-500/40"
          >
            <span className="text-4xl">🏢</span>
          </motion.div>
          <h1 className="text-3xl font-black text-white tracking-tight">Grazitti Interactive</h1>
          <p className="text-white/50 text-sm mt-1.5">Visitor Management System</p>
        </div>

        {/* Tab switcher */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-1.5 flex gap-1 mb-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 px-2 rounded-xl text-xs font-bold transition-all ${
                tab === t.id
                  ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-7"
          >
            {tab === 'visitor' && <VisitorPanel />}
            {tab === 'pass' && <PassPanel navigate={navigate} />}
            {tab === 'login' && <LoginPanel login={login} navigate={navigate} />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ── Visitor (Day Pass) Panel ──────────────────────────────────────────────────
function VisitorPanel() {
  const navigate = useNavigate();
  return (
    <div className="text-center space-y-5">
      <div>
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl">🏢</span>
        </div>
        <h2 className="text-xl font-black text-white">Day Pass Check-In</h2>
        <p className="text-white/50 text-sm mt-1">For one-time visitors — meetings, interviews, deliveries</p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[['📋', 'Fill Details'], ['📸', 'Take Photo'], ['🎫', 'Get QR Pass']].map(([icon, label]) => (
          <div key={label} className="bg-white/5 rounded-xl p-3">
            <div className="text-xl mb-1">{icon}</div>
            <p className="text-xs text-white/60 font-medium">{label}</p>
          </div>
        ))}
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/visitor')}
        className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/30 text-sm"
      >
        Start Check-In →
      </motion.button>
    </div>
  );
}

// ── Monthly Pass Panel ────────────────────────────────────────────────────────
function PassPanel({ navigate }) {
  return (
    <div className="text-center space-y-5">
      <div>
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl">🎫</span>
        </div>
        <h2 className="text-xl font-black text-white">Monthly Access Pass</h2>
        <p className="text-white/50 text-sm mt-1">For recurring access — contractors, interns, vendors</p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[['📝', 'Request Pass'], ['✅', 'Admin Approval'], ['🔑', 'Daily Check-In']].map(([icon, label]) => (
          <div key={label} className="bg-white/5 rounded-xl p-3">
            <div className="text-xl mb-1">{icon}</div>
            <p className="text-xs text-white/60 font-medium">{label}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/pass/request')}
          className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/30 text-sm"
        >
          Request Pass →
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/pass/login')}
          className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl border border-white/20 text-sm transition-colors"
        >
          Sign In →
        </motion.button>
      </div>
    </div>
  );
}

// ── Staff Login Panel ─────────────────────────────────────────────────────────
function LoginPanel({ login, navigate }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      toast.success(`Welcome, ${data.user.name}!`);
      navigate(data.user.role === 'admin' ? '/admin' : '/guard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl">🔐</span>
        </div>
        <h2 className="text-xl font-black text-white">Staff Portal</h2>
        <p className="text-white/50 text-sm mt-1">Admin & Guard access only</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email" required value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          placeholder="Email address"
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm"
        />
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'} required value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Password"
            className="w-full px-4 py-3 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm"
          />
          <button type="button" onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-lg">
            {showPass ? '🙈' : '👁️'}
          </button>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 disabled:opacity-60 text-sm"
        >
          {loading
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</span>
            : 'Sign In →'
          }
        </motion.button>
      </form>
    </div>
  );
}
