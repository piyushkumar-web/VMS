import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function BlacklistPanel() {
  const [list, setList]     = useState([]);
  const [form, setForm]     = useState({ phone: '', reason: '' });
  const [loading, setLoading] = useState(false);

  const fetchList = async () => { const { data } = await api.get('/blacklist'); setList(data); };
  useEffect(() => { fetchList(); }, []);

  const add = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/blacklist', form);
      toast.success('Phone number blacklisted');
      setForm({ phone: '', reason: '' }); fetchList();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const remove = async (id) => {
    await api.delete(`/blacklist/${id}`);
    toast.success('Removed from blacklist'); fetchList();
  };

  return (
    <div className="space-y-4">
      <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        onSubmit={add} className="bg-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-100 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-lg shadow-sm">🚫</div>
          <div>
            <h3 className="font-black text-slate-800">Add to Blacklist</h3>
            <p className="text-xs text-slate-400">Block a phone number from registering</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input required value={form.phone} onChange={e => setForm({...form,phone:e.target.value})}
            placeholder="Phone number" className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-sm transition-all" />
          <input value={form.reason} onChange={e => setForm({...form,reason:e.target.value})}
            placeholder="Reason (optional)" className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-sm transition-all" />
          <motion.button whileTap={{ scale: 0.96 }} type="submit" disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-xl shadow-md shadow-red-200 text-sm disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : '🚫'} Blacklist
          </motion.button>
        </div>
      </motion.form>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800">Blacklisted Numbers</h3>
          <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">{list.length} entries</span>
        </div>
        {list.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-semibold">No blacklisted numbers</p>
            <p className="text-xs mt-1">All visitors are permitted</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            <AnimatePresence>
              {list.map((item, i) => (
                <motion.div key={item._id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                  transition={{ delay: i * 0.04 }}
                  className="px-4 sm:px-5 py-4 flex items-center gap-3 hover:bg-red-50/30 transition-colors">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-sm">🚫</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 font-mono">{item.phone}</p>
                    <p className="text-xs text-slate-400 truncate">{item.reason || 'No reason'} · {item.addedByName}</p>
                  </div>
                  <p className="text-xs text-slate-400 hidden sm:block whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString()}</p>
                  <motion.button whileTap={{ scale: 0.93 }} onClick={() => remove(item._id)}
                    className="text-xs font-bold text-red-400 hover:text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-50 border border-red-100 transition-colors flex-shrink-0">
                    Remove
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
