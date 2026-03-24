import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const INIT = { name: '', email: '', password: '', phone: '', role: 'guard' };
const inp = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-all';

export default function Guards() {
  const [guards, setGuards]       = useState([]);
  const [form, setForm]           = useState(INIT);
  const [showForm, setShowForm]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const fetchGuards = async () => { const { data } = await api.get('/auth/guards'); setGuards(data); };
  useEffect(() => { fetchGuards(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/auth/create', form);
      toast.success(`${form.role === 'admin' ? 'Admin' : 'Guard'} created!`);
      setForm(INIT); setShowForm(false); fetchGuards();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const toggle = async (id) => {
    const { data } = await api.patch(`/auth/${id}/toggle`);
    toast.success(data.isActive ? 'Account activated' : 'Account deactivated');
    fetchGuards();
  };

  const remove = async (id) => {
    if (!confirm('Delete this user?')) return;
    await api.delete(`/auth/${id}`);
    toast.success('User deleted'); fetchGuards();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-slate-800">User Management</h3>
          <p className="text-xs text-slate-400 mt-0.5">{guards.length} users registered</p>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2.5 font-bold rounded-xl shadow-md text-sm transition-all ${showForm ? 'bg-slate-100 text-slate-700 shadow-slate-200' : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200'}`}>
          {showForm ? '✕ Cancel' : '+ Add User'}
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-100 space-y-4">
            <h4 className="font-black text-slate-700 flex items-center gap-2">
              <span className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center text-sm">👤</span>
              Create New User
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[['name','Full Name','text','John Doe'],['email','Email','email','guard@vms.com'],['password','Password','password','••••••••'],['phone','Phone','tel','+91 98765 43210']].map(([name,label,type,ph]) => (
                <div key={name}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
                  <input type={type} required={name!=='phone'} placeholder={ph} value={form[name]}
                    onChange={e => setForm({...form,[name]:e.target.value})} className={inp} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Role</label>
                <select value={form.role} onChange={e => setForm({...form,role:e.target.value})}
                  className={inp}>
                  <option value="guard">Guard</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-md shadow-orange-200 text-sm disabled:opacity-60 flex items-center gap-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Creating...</> : '✓ Create User'}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800">All Users</h3>
          <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">{guards.length} total</span>
        </div>
        {guards.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-4xl mb-3">👤</p>
            <p className="font-semibold">No users yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {guards.map((g, i) => (
              <motion.div key={g._id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="px-4 sm:px-5 py-4 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-md flex-shrink-0 ${g.role === 'admin' ? 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-200' : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-200'}`}>
                  {g.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate">{g.name}</p>
                  <p className="text-xs text-slate-400 truncate">{g.email}{g.phone ? ` · ${g.phone}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`hidden sm:inline px-2 py-0.5 rounded-full text-xs font-bold ${g.role==='admin'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>{g.role}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${g.isActive?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{g.isActive?'Active':'Off'}</span>
                  <button onClick={() => toggle(g._id)}
                    className="text-xs font-bold text-slate-400 hover:text-orange-600 transition-colors px-2 py-1 rounded-lg hover:bg-orange-50 hidden sm:block">
                    {g.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => remove(g._id)}
                    className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
