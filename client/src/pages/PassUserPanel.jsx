import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';

const OFFICE = { lat: 30.6942, lng: 76.8606, radiusMeters: 200 };
const PAGE_SIZE = 7;

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function requestGeo() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      err => { console.warn('Geo:', err.message); resolve(null); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

const passApi = axios.create({ baseURL: '/api/passes' });
passApi.interceptors.request.use(cfg => {
  const t = localStorage.getItem('pass_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function PassUserPanel() {
  const navigate = useNavigate();
  const passUser = JSON.parse(localStorage.getItem('pass_user') || '{}');
  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [tab, setTab] = useState('home');

  // geo
  const [geoStatus, setGeoStatus] = useState('idle');
  const [geoCoords, setGeoCoords] = useState(null);
  const [isInsidePremises, setIsInsidePremises] = useState(null);
  const [distanceM, setDistanceM] = useState(null);
  const geoIntervalRef = useRef(null);

  // attendance filters + pagination
  const [attPage, setAttPage] = useState(1);
  const [attDateFilter, setAttDateFilter] = useState('');
  const [attStatusFilter, setAttStatusFilter] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('pass_token')) { navigate('/pass/login'); return; }
    fetchPass();
    initGeo();
    return () => clearInterval(geoIntervalRef.current);
  }, []);

  const fetchPass = async () => {
    try {
      const { data } = await passApi.get('/me');
      setPassData(data);
    } catch {
      localStorage.removeItem('pass_token');
      localStorage.removeItem('pass_user');
      navigate('/pass/login');
    } finally { setLoading(false); }
  };

  const initGeo = async () => {
    setGeoStatus('requesting');
    const coords = await requestGeo();
    if (!coords) { setGeoStatus('denied'); return; }
    updateGeoState(coords);
    setGeoStatus('granted');
    geoIntervalRef.current = setInterval(async () => {
      const fresh = await requestGeo();
      if (!fresh) return;
      updateGeoState(fresh);
      try {
        const { data } = await passApi.patch('/location', { lat: fresh.lat, lng: fresh.lng, accuracy: fresh.accuracy });
        if (!data.isInsidePremises) toast.error(`You are outside office premises (${data.distanceMeters}m away).`, { duration: 8000 });
        else toast.success('Location verified — inside office premises.', { duration: 3000 });
      } catch { /* silent */ }
    }, 15 * 60 * 1000);
  };

  const updateGeoState = (coords) => {
    setGeoCoords(coords);
    const dist = haversineMeters(coords.lat, coords.lng, OFFICE.lat, OFFICE.lng);
    setDistanceM(Math.round(dist));
    setIsInsidePremises(dist <= OFFICE.radiusMeters);
  };

  const handleCheckIn = async () => {
    setActionLoading('checkin');
    let coords = geoCoords;
    if (!coords) {
      coords = await requestGeo();
      if (!coords) { toast.error('Location required for check-in.'); setActionLoading(''); return; }
      updateGeoState(coords);
    }
    try {
      const { data } = await passApi.post('/checkin', { lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy });
      toast.success(data.message);
      fetchPass();
    } catch (err) { toast.error(err.response?.data?.message || 'Check-in failed'); }
    finally { setActionLoading(''); }
  };

  const handleCheckOut = async () => {
    setActionLoading('checkout');
    let coords = geoCoords;
    if (!coords) {
      coords = await requestGeo();
      if (!coords) { toast.error('Location required for check-out.'); setActionLoading(''); return; }
      updateGeoState(coords);
    }
    try {
      const { data } = await passApi.post('/checkout', { lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy });
      toast.success(`${data.message} · Duration: ${data.durationMins} min`);
      fetchPass();
    } catch (err) { toast.error(err.response?.data?.message || 'Check-out failed'); }
    finally { setActionLoading(''); }
  };

  const logout = () => {
    clearInterval(geoIntervalRef.current);
    localStorage.removeItem('pass_token');
    localStorage.removeItem('pass_user');
    navigate('/pass/login');
  };

  // Filtered + paginated attendance logs
  const filteredLogs = useMemo(() => {
    if (!passData?.attendanceLogs) return [];
    let logs = [...passData.attendanceLogs].reverse();
    if (attDateFilter) logs = logs.filter(l => l.date === attDateFilter);
    if (attStatusFilter) {
      logs = logs.filter(l => {
        const s = l.checkOut ? 'complete' : l.checkIn ? 'checked-in' : 'absent';
        return s === attStatusFilter;
      });
    }
    return logs;
  }, [passData, attDateFilter, attStatusFilter]);

  const attPages = Math.ceil(filteredLogs.length / PAGE_SIZE) || 1;
  const pagedLogs = filteredLogs.slice((attPage - 1) * PAGE_SIZE, attPage * PAGE_SIZE);

  const clearAttFilters = () => { setAttDateFilter(''); setAttStatusFilter(''); setAttPage(1); };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  const today = new Date().toISOString().split('T')[0];
  const todayLog = passData?.attendanceLogs?.find(l => l.date === today);
  const isCheckedIn = todayLog?.checkIn && !todayLog?.checkOut;
  const isCheckedOut = !!todayLog?.checkOut;
  const daysLeft = passData ? Math.max(0, Math.ceil((new Date(passData.endDate) - new Date()) / 86400000)) : 0;
  const isExpired = passData && today > passData.endDate;

  const GeoBadge = () => (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
      geoStatus === 'requesting' ? 'bg-blue-50 text-blue-600' :
      geoStatus === 'denied' ? 'bg-red-50 text-red-600' :
      isInsidePremises ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
    }`}>
      {geoStatus === 'requesting' && <><div className="w-3 h-3 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin" /> Locating…</>}
      {geoStatus === 'denied' && '⚠️ Location denied — allow in browser settings'}
      {geoStatus === 'granted' && (isInsidePremises ? `✅ Inside premises · ${distanceM}m from office` : `⚠️ Outside premises · ${distanceM}m away`)}
    </div>
  );

  const StatusBadge = ({ log }) => {
    const s = log.checkOut ? 'complete' : log.checkIn ? 'checked-in' : 'absent';
    const cls = s === 'complete' ? 'bg-blue-100 text-blue-700' : s === 'checked-in' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500';
    const label = s === 'complete' ? 'Complete' : s === 'checked-in' ? 'Checked In' : 'Absent';
    return <span className={`px-2 py-1 rounded-full text-xs font-bold ${cls}`}>{label}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-200">
            <span className="text-white text-lg">🎫</span>
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-sm">Pass Portal</h1>
            <p className="text-xs text-slate-500">{passUser?.fullName}</p>
          </div>
        </div>
        <button onClick={logout} className="text-xs text-slate-500 hover:text-red-500 font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">Logout</button>
      </header>

      {/* Tabs */}
      <div className="flex bg-white border-b border-slate-200 px-2 sticky top-[73px] z-10">
        {[{ id: 'home', label: '🏠 Home' }, { id: 'attendance', label: '📋 Attendance' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs font-semibold transition-all border-b-2 ${tab === t.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
            {t.id === 'attendance' && passData?.attendanceLogs?.length > 0 && (
              <span className="ml-1.5 bg-orange-100 text-orange-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {passData.attendanceLogs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">

        {/* ── HOME TAB ── */}
        {tab === 'home' && (
          <>
            {/* Pass card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-orange-200 text-xs font-semibold uppercase tracking-wider">Access Pass</p>
                  <h2 className="text-xl font-black mt-1">{passData?.fullName}</h2>
                  <p className="text-orange-200 text-sm">{passData?.purpose}</p>
                </div>
                {passData?.photoUrl
                  ? <img src={passData.photoUrl} className="w-14 h-14 rounded-2xl object-cover border-2 border-white/30" alt="" />
                  : <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black">{passData?.fullName?.[0]}</div>
                }
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-orange-200 text-xs">Valid From</p>
                  <p className="font-bold">{passData?.startDate}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-orange-200 text-xs">Valid Until</p>
                  <p className="font-bold">{passData?.endDate}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-orange-200 text-xs font-mono">ID: {passData?.passId?.slice(0, 12)}…</p>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${isExpired ? 'bg-red-500/30 text-red-200' : daysLeft <= 3 ? 'bg-yellow-500/30 text-yellow-200' : 'bg-white/20 text-white'}`}>
                  {isExpired ? 'EXPIRED' : `${daysLeft}d left`}
                </span>
              </div>
            </motion.div>

            <GeoBadge />

            {/* Today's attendance */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4">Today's Attendance
                <span className="ml-2 text-xs text-slate-400 font-normal">{today}</span>
              </h3>
              {isExpired ? (
                <div className="text-center py-4 text-red-500 font-semibold text-sm">Your pass has expired</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={`rounded-xl p-3 ${todayLog?.checkIn ? 'bg-green-50 border border-green-100' : 'bg-slate-50 border border-slate-100'}`}>
                      <p className="text-xs text-slate-400 mb-1">Check-In</p>
                      <p className={`font-bold text-sm ${todayLog?.checkIn ? 'text-green-700' : 'text-slate-400'}`}>{fmt(todayLog?.checkIn)}</p>
                      {todayLog?.checkInGeo && <p className="text-xs mt-0.5 text-slate-400">{todayLog.checkInGeo.isInsidePremises ? '✅ Inside' : '⚠️ Outside'}</p>}
                    </div>
                    <div className={`rounded-xl p-3 ${todayLog?.checkOut ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50 border border-slate-100'}`}>
                      <p className="text-xs text-slate-400 mb-1">Check-Out</p>
                      <p className={`font-bold text-sm ${todayLog?.checkOut ? 'text-blue-700' : 'text-slate-400'}`}>{fmt(todayLog?.checkOut)}</p>
                      {todayLog?.checkOutGeo && <p className="text-xs mt-0.5 text-slate-400">{todayLog.checkOutGeo.isInsidePremises ? '✅ Inside' : '⚠️ Outside'}</p>}
                    </div>
                  </div>

                  {!isCheckedIn && !isCheckedOut && (
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleCheckIn}
                      disabled={actionLoading === 'checkin' || geoStatus === 'requesting'}
                      className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-2xl shadow-lg shadow-green-200 disabled:opacity-50 text-base">
                      {actionLoading === 'checkin' ? 'Checking in…' : '✅ Check In'}
                    </motion.button>
                  )}
                  {isCheckedIn && (
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleCheckOut}
                      disabled={actionLoading === 'checkout'}
                      className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 disabled:opacity-50 text-base">
                      {actionLoading === 'checkout' ? 'Checking out…' : '🚪 Check Out'}
                    </motion.button>
                  )}
                  {isCheckedOut && (
                    <div className="text-center py-3 bg-slate-50 rounded-2xl">
                      <p className="text-slate-600 font-semibold text-sm">✅ Attendance complete for today</p>
                      {todayLog?.checkIn && todayLog?.checkOut && (
                        <p className="text-xs text-slate-400 mt-1">
                          Duration: {Math.round((new Date(todayLog.checkOut) - new Date(todayLog.checkIn)) / 60000)} min
                        </p>
                      )}
                    </div>
                  )}
                  {geoStatus === 'denied' && (
                    <p className="text-xs text-red-500 text-center mt-2">⚠️ Location access required for check-in/out</p>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ── ATTENDANCE TAB ── */}
        {tab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Attendance History</h2>
              <span className="text-xs text-slate-400">{filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <input type="date" value={attDateFilter}
                onChange={e => { setAttDateFilter(e.target.value); setAttPage(1); }}
                className="flex-1 min-w-36 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500" />
              <select value={attStatusFilter}
                onChange={e => { setAttStatusFilter(e.target.value); setAttPage(1); }}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500">
                <option value="">All Status</option>
                <option value="complete">Complete</option>
                <option value="checked-in">Checked In</option>
                <option value="absent">Absent</option>
              </select>
              {(attDateFilter || attStatusFilter) && (
                <button onClick={clearAttFilters}
                  className="px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-xl border border-red-100">
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Records */}
            {pagedLogs.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-semibold">No records found</p>
              </div>
            ) : pagedLogs.map((log, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-slate-800">{log.date}</p>
                  <StatusBadge log={log} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl p-3 ${log.checkIn ? 'bg-green-50' : 'bg-slate-50'}`}>
                    <p className="text-xs text-slate-400 mb-1">Check-In</p>
                    <p className={`font-bold text-sm ${log.checkIn ? 'text-green-700' : 'text-slate-400'}`}>{fmt(log.checkIn)}</p>
                    {log.checkInGeo && <p className="text-xs text-slate-400 mt-0.5">{log.checkInGeo.isInsidePremises ? '✅ Inside' : '⚠️ Outside'}</p>}
                  </div>
                  <div className={`rounded-xl p-3 ${log.checkOut ? 'bg-blue-50' : 'bg-slate-50'}`}>
                    <p className="text-xs text-slate-400 mb-1">Check-Out</p>
                    <p className={`font-bold text-sm ${log.checkOut ? 'text-blue-700' : 'text-slate-400'}`}>{fmt(log.checkOut)}</p>
                    {log.checkOutGeo && <p className="text-xs text-slate-400 mt-0.5">{log.checkOutGeo.isInsidePremises ? '✅ Inside' : '⚠️ Outside'}</p>}
                  </div>
                </div>
                {log.checkIn && log.checkOut && (
                  <p className="text-xs text-slate-400 mt-2 text-right">
                    Duration: <span className="font-semibold text-slate-600">{Math.round((new Date(log.checkOut) - new Date(log.checkIn)) / 60000)} min</span>
                  </p>
                )}
              </motion.div>
            ))}

            {/* Pagination */}
            {attPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <button disabled={attPage === 1} onClick={() => setAttPage(p => p - 1)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white rounded-xl border border-slate-200 disabled:opacity-40">
                  ← Prev
                </button>
                <span className="text-xs text-slate-500">Page {attPage} of {attPages}</span>
                <button disabled={attPage === attPages} onClick={() => setAttPage(p => p + 1)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white rounded-xl border border-slate-200 disabled:opacity-40">
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
