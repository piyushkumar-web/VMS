import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/guard'} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(data.user.role === 'admin' ? '/admin' : '/guard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        {/* Glass card */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-8 sm:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30"
            >
              <span className="text-white text-3xl">🏢</span>
            </motion.div>
            <h1 className="text-2xl font-black text-white">Staff Portal</h1>
            <p className="text-white/50 text-sm mt-1">Visitor Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">Email Address</label>
              <input
                type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="admin@vms.com"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white/70 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none transition-all text-sm"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors text-lg">
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all disabled:opacity-60 text-sm mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In →'}
            </motion.button>
          </form>

          {/* Visitor link */}
          <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
            <p className="text-xs text-white/40 mb-2">Not staff? Register as a visitor</p>
            <a href="/visitor"
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all">
              Visitor Check-In Form →
            </a>
          </div>

          {/* Default creds */}
          <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-xs font-bold text-white/40 mb-2.5 text-center uppercase tracking-wider">Default Credentials</p>
            <div className="space-y-2">
              {[
                { role: 'Admin', color: 'bg-purple-500/20 text-purple-300', cred: 'admin@vms.com / Admin@123' },
                { role: 'Guard', color: 'bg-blue-500/20 text-blue-300', cred: 'guard@vms.com / Guard@123' },
              ].map(({ role, color, cred }) => (
                <div key={role} className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{role}</span>
                  <span className="font-mono text-xs text-white/50">{cred}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
