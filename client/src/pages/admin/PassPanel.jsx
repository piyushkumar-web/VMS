import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  expired: 'bg-slate-100 text-slate-500',
};

export default function PassPanel() {
  const [passes, setPasses] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [selected, setSelected] = useState(null); // pass detail modal
  const [actionLoading, setActionLoading] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [tenureEdit, setTenureEdit] = useState({ startDate: '', endDate: '' });
  const [showTenure, setShowTenure] = useState(false);

  const [testingMail, setTestingMail] = useState(false);

  const testMail = async () => {
    setTestingMail(true);
    try {
      const { data } = await api.post('/passes/test-mail');
      toast.success(data.message);
    } catch (err) {
      toast.error('Mail config error: ' + (err.response?.data?.message || err.message), { duration: 8000 });
    } finally { setTestingMail(false); }
  };

  const fetchPasses = useCallback(async (p = page, s = search, st = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 15 });
      if (s) params.set('search', s);
      if (st) params.set('status', st);
      const { data } = await api.get(`/passes?${params}`);
      setPasses(data.passes);
      setTotal(data.total);
      setPages(data.pages);
    } catch { toast.error('Failed to load passes'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchPasses(); }, [page, search, statusFilter]);

  const handleSearch = e => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const openDetail = (pass) => {
    setSelected(pass);
    setTenureEdit({ startDate: pass.startDate, endDate: pass.endDate });
    setShowDecline(false);
    setShowTenure(false);
    setDeclineReason('');
  };

  const approve = async () => {
    setActionLoading('approve');
    try {
      const { data } = await api.patch(`/passes/${selected._id}/approve`, { startDate: tenureEdit.startDate, endDate: tenureEdit.endDate });
      if (data.mailSent === false) {
        toast.error(`Pass approved but email failed: ${data.mailError || 'Unknown mail error'}. Check server MAIL_USER / MAIL_PASS in .env`, { duration: 8000 });
      } else {
        toast.success('Pass approved & email sent to ' + selected.email + ' ✅');
      }
      setSelected(null);
      fetchPasses(page, search, statusFilter);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(''); }
  };

  const decline = async () => {
    setActionLoading('decline');
    try {
      await api.patch(`/passes/${selected._id}/decline`, { reason: declineReason });
      toast.success('Pass declined');
      setSelected(null);
      fetchPasses(page, search, statusFilter);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(''); }
  };

  const updateTenure = async () => {
    setActionLoading('tenure');
    try {
      await api.patch(`/passes/${selected._id}/tenure`, tenureEdit);
      toast.success('Tenure updated');
      setShowTenure(false);
      fetchPasses(page, search, statusFilter);
      setSelected(prev => ({ ...prev, ...tenureEdit }));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(''); }
  };

  const deletePass = async (id) => {
    if (!confirm('Delete this pass request?')) return;
    await api.delete(`/passes/${id}`);
    toast.success('Deleted');
    setSelected(null);
    fetchPasses(page, search, statusFilter);
  };

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', val: total, color: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
          { label: 'Pending', val: passes.filter(p => p.status === 'pending').length, color: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
          { label: 'Approved', val: passes.filter(p => p.status === 'approved').length, color: 'bg-green-50 border-green-200', text: 'text-green-700' },
          { label: 'Declined', val: passes.filter(p => p.status === 'declined').length, color: 'bg-red-50 border-red-200', text: 'text-red-700' },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <p className="text-xs text-slate-400 font-medium">{s.label}</p>
            <p className={`text-2xl font-black ${s.text}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Mail config warning */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
        <p className="text-xs text-blue-700 font-medium">Approval emails use <span className="font-mono font-bold">{import.meta.env.VITE_MAIL_HINT || 'MAIL_USER'}</span> in server .env</p>
        <button onClick={testMail} disabled={testingMail}
          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors">
          {testingMail ? 'Sending…' : '📧 Test Mail'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Search name, email, phone…"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500" />
          <button type="submit" className="px-4 py-2.5 bg-orange-500 text-white font-bold rounded-xl text-sm hover:bg-orange-600 transition-colors">Search</button>
        </form>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500">
          <option value="">All Status</option>
          {['pending', 'approved', 'declined', 'expired'].map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setSearchInput(''); setStatusFilter(''); setPage(1); }}
            className="px-3 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-xl border border-red-100">
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : passes.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">🎫</p>
            <p className="font-semibold">No pass requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Name', 'Email', 'Purpose', 'Tenure', 'Geo', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {passes.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.photoUrl
                          ? <img src={p.photoUrl} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt="" />
                          : <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 flex-shrink-0">{p.fullName[0]}</div>
                        }
                        <div>
                          <p className="font-semibold text-slate-800 whitespace-nowrap">{p.fullName}</p>
                          <p className="text-xs text-slate-400">{p.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{p.email}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{p.purpose}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      <p>{p.startDate}</p>
                      <p className="text-slate-400">→ {p.endDate}</p>
                    </td>
                    <td className="px-4 py-3">
                      {p.geoLocation?.lat ? (
                        <span className={`text-xs font-semibold ${p.geoLocation.isInsidePremises ? 'text-green-600' : 'text-orange-500'}`}>
                          {p.geoLocation.isInsidePremises ? '✅ Inside' : '⚠️ Outside'}
                        </span>
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(p)}
                        className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold text-xs rounded-lg transition-colors">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white rounded-xl border border-slate-200 disabled:opacity-40">← Prev</button>
          <span className="text-xs text-slate-500">Page {page} of {pages} · {total} records</span>
          <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white rounded-xl border border-slate-200 disabled:opacity-40">Next →</button>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

              {selected.photoUrl && <img src={selected.photoUrl} alt="" className="w-full h-44 object-cover rounded-t-3xl" />}

              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{selected.fullName}</h3>
                    <p className="text-slate-500 text-sm">{selected.company || 'Individual'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[selected.status]}`}>{selected.status.toUpperCase()}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['📧', 'Email', selected.email],
                    ['📞', 'Phone', selected.phone],
                    ['🎯', 'Purpose', selected.purpose],
                    ['👤', 'Host', selected.host || '—'],
                    ['📅', 'Start', selected.startDate],
                    ['📅', 'End', selected.endDate],
                  ].map(([icon, label, val]) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-400">{icon} {label}</p>
                      <p className="font-semibold text-slate-700 text-sm truncate">{val}</p>
                    </div>
                  ))}
                </div>

                {/* Geo info */}
                {selected.geoLocation?.lat && (
                  <div className={`rounded-xl p-3 border ${selected.geoLocation.isInsidePremises ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-200'}`}>
                    <p className={`text-xs font-semibold ${selected.geoLocation.isInsidePremises ? 'text-green-700' : 'text-orange-700'}`}>
                      {selected.geoLocation.isInsidePremises ? '✅ Registered from inside office' : '⚠️ Registered from outside office'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {selected.geoLocation.lat.toFixed(5)}, {selected.geoLocation.lng.toFixed(5)}
                    </p>
                  </div>
                )}

                {/* Tenure edit */}
                {selected.status === 'approved' && (
                  <div>
                    <button onClick={() => setShowTenure(!showTenure)}
                      className="text-sm text-orange-500 font-semibold hover:underline">
                      {showTenure ? '▲ Hide' : '✏️ Edit Tenure'}
                    </button>
                    {showTenure && (
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Start Date</label>
                            <input type="date" value={tenureEdit.startDate} onChange={e => setTenureEdit(t => ({ ...t, startDate: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500" />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block">End Date</label>
                            <input type="date" value={tenureEdit.endDate} onChange={e => setTenureEdit(t => ({ ...t, endDate: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500" />
                          </div>
                        </div>
                        <button onClick={updateTenure} disabled={actionLoading === 'tenure'}
                          className="w-full py-2.5 bg-orange-500 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                          {actionLoading === 'tenure' ? 'Saving…' : 'Save Tenure'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {selected.status === 'pending' && (
                  <div className="space-y-3">
                    {/* Tenure for approval */}
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                      <p className="text-xs font-bold text-orange-700 mb-3">📅 Set/Confirm Tenure Before Approving</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 mb-1 block">Start Date</label>
                          <input type="date" value={tenureEdit.startDate} onChange={e => setTenureEdit(t => ({ ...t, startDate: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 mb-1 block">End Date</label>
                          <input type="date" value={tenureEdit.endDate} onChange={e => setTenureEdit(t => ({ ...t, endDate: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-500" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={approve} disabled={actionLoading === 'approve'}
                        className="py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 disabled:opacity-50 transition-colors">
                        {actionLoading === 'approve' ? '…' : '✅ Approve & Email'}
                      </button>
                      <button onClick={() => setShowDecline(!showDecline)}
                        className="py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-colors">
                        ❌ Decline
                      </button>
                    </div>
                    {showDecline && (
                      <div className="space-y-2">
                        <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)}
                          placeholder="Reason for declining (optional)…" rows={2}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-red-400 resize-none" />
                        <button onClick={decline} disabled={actionLoading === 'decline'}
                          className="w-full py-2.5 bg-red-500 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                          {actionLoading === 'decline' ? 'Declining…' : 'Confirm Decline'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setSelected(null)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm">
                    Close
                  </button>
                  <button onClick={() => deletePass(selected._id)}
                    className="px-4 py-2.5 bg-red-50 text-red-500 font-bold rounded-xl hover:bg-red-100 transition-colors text-sm">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
