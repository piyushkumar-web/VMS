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
                  <tr key={p._id} onClick={() => openDetail(p)}
                    className="hover:bg-orange-50/60 transition-colors cursor-pointer group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.photoUrl
                          ? <img src={p.photoUrl} className="w-8 h-10 rounded-lg object-cover object-top flex-shrink-0" alt="" />
                          : <div className="w-8 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 flex-shrink-0">{p.fullName[0]}</div>
                        }
                        <div>
                          <p className="font-semibold text-slate-800 whitespace-nowrap group-hover:text-orange-600 transition-colors">{p.fullName}</p>
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
                      <span className="px-3 py-1.5 bg-orange-50 group-hover:bg-orange-100 text-orange-600 font-semibold text-xs rounded-lg transition-colors inline-block">
                        View →
                      </span>
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
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center sm:p-4"
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col"
            >
              {/* ── Hero: photo + identity ── */}
              <div className="relative flex-shrink-0">

                {/* Portrait photo — full width on mobile, fixed height */}
                <div className="relative w-full h-56 sm:h-64 bg-slate-900 overflow-hidden">
                  {selected.photoUrl
                    ? <img
                        src={selected.photoUrl}
                        alt={selected.fullName}
                        className="w-full h-full object-cover object-top"
                      />
                    : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
                        <span className="text-8xl font-black text-white/20 select-none">{selected.fullName[0]}</span>
                      </div>
                  }
                  {/* Dark gradient overlay at bottom */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Close button — top right */}
                  <button
                    onClick={() => setSelected(null)}
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors text-sm backdrop-blur-sm"
                  >
                    ✕
                  </button>

                  {/* Status pill — top left */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-sm ${
                      selected.status === 'approved' ? 'bg-green-500/90 text-white' :
                      selected.status === 'pending'  ? 'bg-amber-400/90 text-amber-900' :
                      selected.status === 'declined' ? 'bg-red-500/90 text-white' :
                                                       'bg-slate-500/90 text-white'
                    }`}>{selected.status}</span>
                  </div>

                  {/* Name + meta — bottom overlay */}
                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-8">
                    <h3 className="text-xl font-black text-white leading-tight">{selected.fullName}</h3>
                    <p className="text-white/60 text-sm mt-0.5">
                      {selected.company || 'Individual'}
                      {selected.purpose && <span className="text-white/40"> · {selected.purpose}</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Scrollable body ── */}
              <div className="overflow-y-auto flex-1">
                <div className="p-5 space-y-4">

                  {/* Contact info grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { icon: '📧', label: 'Email', val: selected.email },
                      { icon: '📞', label: 'Phone', val: selected.phone },
                      { icon: '👤', label: 'Host', val: selected.host || '—' },
                      { icon: '🏢', label: 'Company', val: selected.company || '—' },
                    ].map(({ icon, label, val }) => (
                      <div key={label} className="bg-slate-50 rounded-2xl px-3.5 py-3 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{icon} {label}</p>
                        <p className="text-sm font-semibold text-slate-800 truncate">{val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Tenure strip */}
                  <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
                    <span className="text-lg">📅</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Pass Tenure</p>
                      <p className="text-sm font-bold text-slate-800">{selected.startDate} <span className="text-slate-400 font-normal">→</span> {selected.endDate}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-slate-400">Duration</p>
                      <p className="text-sm font-bold text-orange-600">
                        {Math.ceil((new Date(selected.endDate) - new Date(selected.startDate)) / 86400000) + 1}d
                      </p>
                    </div>
                  </div>

                  {/* Geo info */}
                  {selected.geoLocation?.lat && (
                    <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
                      selected.geoLocation.isInsidePremises
                        ? 'bg-green-50 border-green-100'
                        : 'bg-amber-50 border-amber-100'
                    }`}>
                      <span className="text-lg">{selected.geoLocation.isInsidePremises ? '✅' : '⚠️'}</span>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold ${
                          selected.geoLocation.isInsidePremises ? 'text-green-700' : 'text-amber-700'
                        }`}>
                          {selected.geoLocation.isInsidePremises ? 'Registered from inside office' : 'Registered from outside office'}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                          {selected.geoLocation.lat.toFixed(5)}, {selected.geoLocation.lng.toFixed(5)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── Tenure edit (approved) ── */}
                  {selected.status === 'approved' && (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setShowTenure(!showTenure)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span>✏️ Edit Tenure</span>
                        <span className="text-slate-400 text-xs">{showTenure ? '▲ Hide' : '▼ Show'}</span>
                      </button>
                      {showTenure && (
                        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Start Date</label>
                              <input type="date" value={tenureEdit.startDate}
                                onChange={e => setTenureEdit(t => ({ ...t, startDate: e.target.value }))}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">End Date</label>
                              <input type="date" value={tenureEdit.endDate}
                                onChange={e => setTenureEdit(t => ({ ...t, endDate: e.target.value }))}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                            </div>
                          </div>
                          <button onClick={updateTenure} disabled={actionLoading === 'tenure'}
                            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm disabled:opacity-50 transition-colors">
                            {actionLoading === 'tenure' ? 'Saving…' : 'Save Changes'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Approve / Decline (pending) ── */}
                  {selected.status === 'pending' && (
                    <div className="space-y-3">
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                        <p className="text-xs font-bold text-amber-700 mb-3 flex items-center gap-1.5"><span>📅</span> Confirm Tenure Before Approving</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Start Date</label>
                            <input type="date" value={tenureEdit.startDate}
                              onChange={e => setTenureEdit(t => ({ ...t, startDate: e.target.value }))}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">End Date</label>
                            <input type="date" value={tenureEdit.endDate}
                              onChange={e => setTenureEdit(t => ({ ...t, endDate: e.target.value }))}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={approve} disabled={actionLoading === 'approve'}
                          className="py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl shadow-md shadow-green-100 disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-1.5">
                          {actionLoading === 'approve'
                            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Approving…</>
                            : <><span>✅</span> Approve & Email</>
                          }
                        </button>
                        <button onClick={() => setShowDecline(!showDecline)}
                          className={`py-3.5 font-bold rounded-2xl shadow-md text-sm transition-colors flex items-center justify-center gap-1.5 ${
                            showDecline
                              ? 'bg-slate-200 text-slate-700 shadow-slate-100'
                              : 'bg-red-500 hover:bg-red-600 text-white shadow-red-100'
                          }`}>
                          <span>❌</span> {showDecline ? 'Cancel' : 'Decline'}
                        </button>
                      </div>

                      {showDecline && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                          className="space-y-2.5"
                        >
                          <textarea
                            value={declineReason} onChange={e => setDeclineReason(e.target.value)}
                            placeholder="Reason for declining (optional)…" rows={2}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
                          />
                          <button onClick={decline} disabled={actionLoading === 'decline'}
                            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                            {actionLoading === 'decline'
                              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Declining…</>
                              : 'Confirm Decline'
                            }
                          </button>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* ── Footer actions ── */}
                  <div className="flex gap-2.5 pt-1 pb-1">
                    <button
                      onClick={() => setSelected(null)}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors text-sm"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => deletePass(selected._id)}
                      className="flex items-center gap-1.5 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-500 font-bold rounded-2xl transition-colors text-sm border border-red-100"
                    >
                      🗑️ Delete
                    </button>
                  </div>

                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
