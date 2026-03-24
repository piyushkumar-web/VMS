import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const STATUS_COLORS = {
  pending:      'bg-amber-100 text-amber-700 border-amber-200',
  approved:     'bg-blue-100 text-blue-700 border-blue-200',
  'checked-in': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'checked-out':'bg-slate-100 text-slate-600 border-slate-200',
  declined:     'bg-red-100 text-red-700 border-red-200',
  flagged:      'bg-orange-100 text-orange-700 border-orange-200',
};

const PURPOSES = ['Meeting', 'Interview', 'Delivery', 'Maintenance', 'Personal', 'Other'];
const LIMITS   = [10, 15, 25, 50];
const MONTHS   = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - i);
  return { value: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: d.toLocaleString('default',{month:'long',year:'numeric'}) };
});

const inp = 'px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-all';

export default function Visitors() {
  const [visitors, setVisitors]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [pages, setPages]           = useState(1);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [status, setStatus]         = useState('');
  const [date, setDate]             = useState('');
  const [month, setMonth]           = useState('');
  const [purpose, setPurpose]       = useState('');
  const [limit, setLimit]           = useState(15);
  const [loading, setLoading]       = useState(false);
  const [selected, setSelected]     = useState(null);
  const [exporting, setExporting]   = useState(false);
  const [editTimes, setEditTimes]   = useState(false);
  const [timeForm, setTimeForm]     = useState({ checkInTime: '', checkOutTime: '', status: '' });
  const [savingTimes, setSavingTimes] = useState(false);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams({ page, limit });
    if (search)  p.set('search', search);
    if (status)  p.set('status', status);
    if (date)    p.set('date', date);
    else if (month) p.set('month', month);
    if (purpose) p.set('purpose', purpose);
    return p;
  }, [page, limit, search, status, date, month, purpose]);

  const fetchVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/visitors?${buildParams()}`);
      setVisitors(data.visitors); setTotal(data.total); setPages(data.pages);
    } finally { setLoading(false); }
  }, [buildParams]);

  useEffect(() => { fetchVisitors(); }, [page, status, date, month, purpose, limit]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); fetchVisitors(); }, 400); return () => clearTimeout(t); }, [search]);

  const resetFilters = () => { setSearch(''); setStatus(''); setDate(''); setMonth(''); setPurpose(''); setPage(1); };

  const openEdit = (v) => {
    setEditTimes(true);
    setTimeForm({
      checkInTime:  v.checkInTime  ? new Date(v.checkInTime).toISOString().slice(0,16)  : '',
      checkOutTime: v.checkOutTime ? new Date(v.checkOutTime).toISOString().slice(0,16) : '',
      status: v.status,
    });
  };

  const saveTimes = async () => {
    setSavingTimes(true);
    try {
      const { data } = await api.patch(`/visitors/${selected._id}/set-times`, timeForm);
      setSelected(data); setEditTimes(false);
      toast.success('Times updated successfully');
      fetchVisitors();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingTimes(false); }
  };

  const deleteVisitor = async (id) => {
    if (!confirm('Delete this visitor record?')) return;
    await api.delete(`/visitors/${id}`);
    toast.success('Visitor deleted');
    fetchVisitors();
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams();
      if (status)  p.set('status', status);
      if (date)    p.set('date', date);
      else if (month) p.set('month', month);
      if (purpose) p.set('purpose', purpose);
      if (search)  p.set('search', search);
      const res = await api.get(`/visitors/export/csv?${p}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url;
      a.download = `visitors-${new Date().toISOString().split('T')[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('CSV exported!');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const hasFilters = search || status || date || month || purpose;
  const pageNums = () => { const n=[],d=2; for(let i=Math.max(1,page-d);i<=Math.min(pages,page+d);i++) n.push(i); return n; };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-4 shadow-md border border-slate-100 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, phone, company, host..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-all" />
          </div>
          <motion.button whileTap={{ scale: 0.96 }} onClick={exportCSV} disabled={exporting}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-200 text-sm disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap">
            {exporting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '⬇'} Export CSV
          </motion.button>
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={inp}>
            <option value="">All Status</option>
            {['pending','checked-in','checked-out','declined','flagged'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={purpose} onChange={e => { setPurpose(e.target.value); setPage(1); }} className={inp}>
            <option value="">All Purposes</option>
            {PURPOSES.map(p => <option key={p}>{p}</option>)}
          </select>
          <input type="date" value={date} onChange={e => { setDate(e.target.value); setMonth(''); setPage(1); }} className={inp} />
          <select value={month} onChange={e => { setMonth(e.target.value); setDate(''); setPage(1); }} className={inp}>
            <option value="">All Months</option>
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} className={inp}>
            {LIMITS.map(l => <option key={l} value={l}>{l} / page</option>)}
          </select>
          {hasFilters && (
            <button onClick={resetFilters} className="px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors">✕ Clear</button>
          )}
        </div>

        {hasFilters && (
          <div className="flex flex-wrap gap-2">
            {search  && <Chip label={`"${search}"`} onRemove={() => setSearch('')} />}
            {status  && <Chip label={status}         onRemove={() => setStatus('')} />}
            {purpose && <Chip label={purpose}        onRemove={() => setPurpose('')} />}
            {date    && <Chip label={`Date: ${date}`}onRemove={() => setDate('')} />}
            {month   && <Chip label={`Month: ${month}`} onRemove={() => setMonth('')} />}
          </div>
        )}
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800">Visitors</h3>
          <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">{total} record{total !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 shimmer rounded-xl" />)}
          </div>
        ) : visitors.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-5xl mb-3">👥</p>
            <p className="font-bold">No visitors found</p>
            {hasFilters && <button onClick={resetFilters} className="mt-3 text-sm text-orange-500 hover:underline font-semibold">Clear filters</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-400 text-xs uppercase">
                <tr>
                  {['Name','Phone','Purpose','Host','Status','Date','Check-in',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold whitespace-nowrap tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visitors.map((v, i) => (
                  <motion.tr key={v._id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="border-t border-slate-50 hover:bg-orange-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {v.photoUrl
                          ? <img src={v.photoUrl} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 shadow-sm" alt="" />
                          : <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xs font-black text-white flex-shrink-0 shadow-sm">{v.fullName[0]}</div>
                        }
                        <span className="font-bold text-slate-800 whitespace-nowrap">{v.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">{v.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{v.purpose}</td>
                    <td className="px-4 py-3 text-slate-500">{v.host || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${STATUS_COLORS[v.status]}`}>{v.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{v.date}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {v.checkInTime ? new Date(v.checkInTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => { setSelected(v); setEditTimes(false); }}
                        className="text-orange-500 hover:text-orange-700 font-bold text-xs mr-3 hover:underline">View</button>
                      <button onClick={() => deleteVisitor(v._id)}
                        className="text-red-400 hover:text-red-600 font-bold text-xs hover:underline">Delete</button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-slate-400">Showing {(page-1)*limit+1}–{Math.min(page*limit,total)} of {total}</span>
            <div className="flex items-center gap-1">
              <PBtn onClick={() => setPage(1)} disabled={page===1} label="«" />
              <PBtn onClick={() => setPage(p=>p-1)} disabled={page===1} label="‹" />
              {pageNums().map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${n===page ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {n}
                </button>
              ))}
              <PBtn onClick={() => setPage(p=>p+1)} disabled={page===pages} label="›" />
              <PBtn onClick={() => setPage(pages)} disabled={page===pages} label="»" />
            </div>
          </div>
        )}
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => { setSelected(null); setEditTimes(false); }}>
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-hidden max-h-[92vh] overflow-y-auto">
              {/* Drag handle (mobile) */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
              </div>

              {selected.photoUrl && <img src={selected.photoUrl} className="w-full h-44 object-cover" alt="" />}

              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">{selected.fullName}</h3>
                    <p className="text-slate-400 text-sm">{selected.company || 'Individual'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    ['📞','Phone',selected.phone],
                    ['📧','Email',selected.email||'—'],
                    ['🎯','Purpose',selected.purpose],
                    ['👤','Host',selected.host||'—'],
                    ['🏢','Company',selected.company||'—'],
                    ['📍','Address',selected.address||'—'],
                    ['📅','Date',selected.date],
                    ['🕐','Check-in',selected.checkInTime?new Date(selected.checkInTime).toLocaleString():'—'],
                    ['🚪','Check-out',selected.checkOutTime?new Date(selected.checkOutTime).toLocaleString():'—'],
                  ].map(([icon,label,val]) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-xs text-slate-400 mb-0.5">{icon} {label}</p>
                      <p className="font-bold text-slate-700 truncate text-xs">{val}</p>
                    </div>
                  ))}
                </div>

                {/* Edit times */}
                {!editTimes ? (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => openEdit(selected)}
                    className="w-full py-3 border-2 border-dashed border-orange-200 text-orange-500 hover:bg-orange-50 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                    ✏️ Edit Check-in / Check-out Times
                  </motion.button>
                ) : (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4 space-y-3 shadow-sm">
                    <p className="text-sm font-black text-orange-700 flex items-center gap-2">✏️ Manual Time Override</p>
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Status</label>
                        <select value={timeForm.status} onChange={e => setTimeForm({...timeForm,status:e.target.value})}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100">
                          {['pending','checked-in','checked-out','declined','flagged'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Check-in Time</label>
                        <input type="datetime-local" value={timeForm.checkInTime}
                          onChange={e => setTimeForm({...timeForm,checkInTime:e.target.value})}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 mb-1 block">Check-out Time</label>
                        <input type="datetime-local" value={timeForm.checkOutTime}
                          onChange={e => setTimeForm({...timeForm,checkOutTime:e.target.value})}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditTimes(false)}
                        className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors">
                        Cancel
                      </button>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={saveTimes} disabled={savingTimes}
                        className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl text-sm shadow-md shadow-orange-200 disabled:opacity-60">
                        {savingTimes ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving...</span> : 'Save Changes'}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {selected.signature && (
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                    <p className="text-xs text-slate-400 mb-1.5">✍️ Signature</p>
                    <img src={selected.signature} className="w-full h-16 object-contain" alt="Signature" />
                  </div>
                )}
                {selected.qrCode && (
                  <div className="text-center py-2">
                    <img src={selected.qrCode} className="w-28 h-28 mx-auto rounded-xl border border-slate-100 shadow-sm" alt="QR" />
                    <p className="text-xs text-slate-400 mt-1.5 font-mono">{selected.visitorId}</p>
                  </div>
                )}
                <button onClick={() => { setSelected(null); setEditTimes(false); }}
                  className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Chip = ({ label, onRemove }) => (
  <span className="flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full border border-orange-200">
    {label}
    <button onClick={onRemove} className="hover:text-orange-900 ml-0.5 text-orange-400">✕</button>
  </span>
);

const PBtn = ({ onClick, disabled, label }) => (
  <button onClick={onClick} disabled={disabled}
    className="w-8 h-8 rounded-lg text-sm font-black text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all">
    {label}
  </button>
);
