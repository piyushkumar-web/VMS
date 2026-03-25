import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';

// Dedicated instance — no staff token, no auto-redirect on 401
const passApi = axios.create({ baseURL: '/api' });

export default function PassLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset password flow
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNew, setResetNew] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const { data } = await passApi.post('/passes/login', {
        email: form.email.trim(),
        password: form.password,
      });
      localStorage.setItem('pass_token', data.token);
      localStorage.setItem('pass_user', JSON.stringify(data.pass));
      toast.success(`Welcome, ${data.pass.fullName}!`);
      navigate('/pass/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async e => {
    e.preventDefault();
    if (resetNew.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (resetNew !== resetConfirm) { toast.error('Passwords do not match'); return; }
    setResetLoading(true);
    try {
      await passApi.post('/passes/reset-password', {
        email: resetEmail.trim(),
        newPassword: resetNew,
      });
      toast.success('Password reset! You can now log in.');
      setForm({ email: resetEmail.trim(), password: resetNew });
      setShowReset(false);
      setResetEmail(''); setResetNew(''); setResetConfirm('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10" />

      <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-md">

        <AnimatePresence mode="wait">

          {/* ── Login form ── */}
          {!showReset && (
            <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-8 sm:p-10">

              <div className="text-center mb-8">
                <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
                  <span className="text-white text-3xl">🎫</span>
                </motion.div>
                <h1 className="text-2xl font-black text-white">Pass Portal</h1>
                <p className="text-white/50 text-sm mt-1">Grazitti Interactive — Access Pass Login</p>
              </div>

              {/* Error banner */}
              {errorMsg && (
                <div className="mb-4 px-4 py-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-sm font-medium">
                  ⚠️ {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2">Email Address</label>
                  <input type="email" required value={form.email}
                    onChange={e => { setForm({ ...form, email: e.target.value }); setErrorMsg(''); }}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2">Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} required value={form.password}
                      onChange={e => { setForm({ ...form, password: e.target.value }); setErrorMsg(''); }}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-lg">
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 disabled:opacity-60 mt-2">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : 'Sign In to Pass Portal →'}
                </motion.button>
              </form>

              <div className="mt-6 text-center space-y-3">
                <button onClick={() => { setShowReset(true); setResetEmail(form.email); setErrorMsg(''); }}
                  className="text-orange-400 text-xs font-semibold hover:text-orange-300 transition-colors underline">
                  Forgot password? Reset it here
                </button>
                <div className="border-t border-white/10 pt-3 space-y-2">
                  <p className="text-white/40 text-xs">Don't have a pass yet?</p>
                  <Link to="/pass/request"
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all">
                    Request Access Pass →
                  </Link>
                </div>
                <Link to="/" className="block text-white/30 text-xs hover:text-white/60 transition-colors">
                  ← Back to Staff Login
                </Link>
              </div>
            </motion.div>
          )}

          {/* ── Reset password form ── */}
          {showReset && (
            <motion.div key="reset" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-8 sm:p-10">

              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">🔑</span>
                </div>
                <h2 className="text-xl font-black text-white">Reset Password</h2>
                <p className="text-white/50 text-xs mt-1">Enter your registered email and set a new password</p>
              </div>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2">Registered Email</label>
                  <input type="email" required value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-orange-400 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2">New Password</label>
                  <input type="password" required value={resetNew}
                    onChange={e => setResetNew(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-orange-400 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white/70 mb-2">Confirm Password</label>
                  <input type="password" required value={resetConfirm}
                    onChange={e => setResetConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-orange-400 outline-none text-sm" />
                </div>
                <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={resetLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 disabled:opacity-60">
                  {resetLoading ? 'Resetting...' : 'Reset Password →'}
                </motion.button>
              </form>

              <button onClick={() => setShowReset(false)}
                className="w-full mt-4 text-white/40 text-xs hover:text-white/70 transition-colors">
                ← Back to Login
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
