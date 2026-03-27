import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  'checked-in': 'bg-green-100 text-green-700',
  'checked-out': 'bg-slate-100 text-slate-600',
  declined: 'bg-red-100 text-red-700',
  flagged: 'bg-orange-100 text-orange-700',
};

const TABS = [
   { id: 'scanned', label: '🆕 Scanned' },
  { id: 'scan', label: '📷 Entry Scan' },
  { id: 'verify', label: '🔍 Verify' },
  { id: 'roster', label: '🚨 Roster' },
  { id: 'recent', label: '📋 Recent' },
];

// One reusable scanner hook per scanner instance id
function useScanner(scannerId, onSuccess) {
  const ref = useRef(null);
  const activeRef = useRef(false);

  const start = async () => {
    if (activeRef.current) return;
    activeRef.current = true;
    await new Promise(r => setTimeout(r, 150));
    try {
      ref.current = new Html5Qrcode(scannerId);
      await ref.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onSuccess,
        () => {}
      );
    } catch {
      toast.error('Camera access denied or not available');
      activeRef.current = false;
    }
  };

  const stop = async () => {
    if (ref.current) {
      try {
        if (ref.current.isScanning) await ref.current.stop();
        await ref.current.clear();
      } catch { /* ignore */ }
      ref.current = null;
    }
    activeRef.current = false;
  };

  return { start, stop, isActive: () => activeRef.current };
}

export default function GuardPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('scan');

  // Entry scan state
  const [entryScanning, setEntryScanning] = useState(false);
  const [visitor, setVisitor] = useState(null);
  const [loadingAction, setLoadingAction] = useState('');
  const [approvedVisitor, setApprovedVisitor] = useState(null); // show success card after approve

  // Verify scan state
  const [verifyScanning, setVerifyScanning] = useState(false);
  const [verifiedVisitor, setVerifiedVisitor] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Roster / Recent
  const [roster, setRoster] = useState([]);
  const [recent, setRecent] = useState([]);
  const [recentPage, setRecentPage] = useState(1);
  const [recentTotal, setRecentTotal] = useState(0);
  const [recentPages, setRecentPages] = useState(1);
  const [recentDate, setRecentDate] = useState('');
  const [recentStatus, setRecentStatus] = useState('');

  // Scanned visitors (pending, for guard to approve without re-scanning)
  const [scanned, setScanned] = useState([]);
  const [scannedLoading, setScannedLoading] = useState(false);
  const [scannedDetail, setScannedDetail] = useState(null);
  const [scannedAction, setScannedAction] = useState('');

  const entryScanner = useScanner('entry-qr-reader', onEntryScan);
  const verifyScanner = useScanner('verify-qr-reader', onVerifyScan);

  useEffect(() => {
    if (tab === 'roster') fetchRoster();
    if (tab === 'recent') fetchRecent(1, recentDate, recentStatus);
    if (tab === 'scanned') fetchScanned();
    // stop both scanners on tab change
    return () => {
      entryScanner.stop();
      verifyScanner.stop();
    };
  }, [tab]);

  // ── Entry scan ──────────────────────────────────────────
  async function onEntryScan(text) {
    await entryScanner.stop();
    setEntryScanning(false);
    try {
      const parsed = JSON.parse(text);
      const { data } = await api.get(`/visitors/scan/${parsed.visitorId}`);
      setVisitor(data);
      setApprovedVisitor(null);
      // Also add to scanned list if pending
      if (data.status === 'pending') {
        setScanned(prev => prev.find(v => v._id === data._id) ? prev : [data, ...prev]);
      }
      toast.success('Visitor found!');
    } catch {
      toast.error('Invalid or unrecognized QR code');
    }
  }

  const startEntryScanner = async () => {
    setEntryScanning(true);
    await entryScanner.start();
  };

  const stopEntryScanner = async () => {
    await entryScanner.stop();
    setEntryScanning(false);
  };

  // ── Verify scan ─────────────────────────────────────────
  async function onVerifyScan(text) {
    await verifyScanner.stop();
    setVerifyScanning(false);
    setVerifyLoading(true);
    try {
      const parsed = JSON.parse(text);
      const { data } = await api.get(`/visitors/scan/${parsed.visitorId}`);
      // Log the verify action
      await api.patch(`/visitors/${data._id}/verify`);
      setVerifiedVisitor(data);
      toast.success('Identity verified!');
    } catch {
      toast.error('Invalid QR or visitor not found');
    } finally {
      setVerifyLoading(false);
    }
  }

  const startVerifyScanner = async () => {
    setVerifyScanning(true);
    await verifyScanner.start();
  };

  const stopVerifyScanner = async () => {
    await verifyScanner.stop();
    setVerifyScanning(false);
  };

  // ── Entry actions ────────────────────────────────────────
  const action = async (type) => {
    if (!visitor) return;
    setLoadingAction(type);
    try {
      const { data } = await api.patch(`/visitors/${visitor._id}/${type}`);
      if (type === 'approve') {
        setApprovedVisitor(data);
        setVisitor(null);
        toast.success('Entry approved ✅');
      } else {
        setVisitor(data);
        const labels = { decline: 'declined ❌', checkout: 'checked out 🚪', flag: 'flagged 🚩' };
        toast.success(`Visitor ${labels[type]}`);
      }
      if (tab === 'roster') fetchRoster();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setLoadingAction('');
    }
  };

  const fetchRoster = async () => {
    const { data } = await api.get('/visitors/inside');
    setRoster(data);
  };

  const fetchScanned = async () => {
    setScannedLoading(true);
    try {
      const { data } = await api.get('/visitors?status=pending&limit=50');
      setScanned(data.visitors);
    } catch { /* silent */ } finally {
      setScannedLoading(false);
    }
  };

  const scannedDoAction = async (type, v) => {
    setScannedAction(v._id + type);
    try {
      await api.patch(`/visitors/${v._id}/${type}`);
      toast.success(type === 'approve' ? 'Entry approved ✅' : 'Visitor declined ❌');
      setScannedDetail(null);
      fetchScanned();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setScannedAction('');
    }
  };

  const fetchRecent = async (page = recentPage, date = recentDate, status = recentStatus) => {
    const p = new URLSearchParams({ page, limit: 10 });
    if (date) p.set('date', date);
    if (status) p.set('status', status);
    const { data } = await api.get(`/visitors?${p}`);
    setRecent(data.visitors);
    setRecentTotal(data.total);
    setRecentPages(data.pages);
  };

  const handleTabChange = (id) => {
    entryScanner.stop();
    verifyScanner.stop();
    setEntryScanning(false);
    setVerifyScanning(false);
    setVisitor(null);
    setApprovedVisitor(null);
    setVerifiedVisitor(null);
    setScannedDetail(null);
    setTab(id);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-200">
            <span className="text-white text-lg">🛡️</span>
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-sm">Guard Terminal</h1>
            <p className="text-xs text-slate-500">{user?.name}</p>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/'); }}
          className="text-xs text-slate-500 hover:text-red-500 font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
          Logout
        </button>
      </header>

      {/* Tabs */}
      <div className="flex bg-white border-b border-slate-200 px-2 gap-0 sticky top-[73px] z-10 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)}
            className={`px-3 py-3 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${tab === t.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full">

        {/* ── ENTRY SCAN TAB ── */}
        {tab === 'scan' && (
          <div className="space-y-4">
            {/* Scanner div always in DOM */}
            <div className={entryScanning ? 'block' : 'hidden'}>
              <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-slate-100">
                <div id="entry-qr-reader" className="w-full" />
                <button onClick={stopEntryScanner}
                  className="w-full py-3 text-sm text-slate-500 hover:text-red-500 font-semibold transition-colors border-t border-slate-100">
                  ✕ Cancel Scan
                </button>
              </div>
            </div>

            {/* Approved success card */}
            <AnimatePresence>
              {approvedVisitor && !visitor && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="bg-green-50 border-2 border-green-200 rounded-3xl p-6 text-center space-y-3">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-3xl">✅</span>
                  </div>
                  <h3 className="text-lg font-bold text-green-800">Entry Approved!</h3>
                  <p className="text-green-700 font-semibold">{approvedVisitor.fullName}</p>
                  <p className="text-sm text-green-600">{approvedVisitor.purpose} · Host: {approvedVisitor.host || 'N/A'}</p>
                  <p className="text-xs text-green-500">Checked in at {new Date(approvedVisitor.checkInTime).toLocaleTimeString()}</p>
                  <button onClick={() => { setApprovedVisitor(null); }}
                    className="mt-2 w-full py-3 bg-orange-500 text-white font-bold rounded-xl shadow-md shadow-orange-200">
                    📷 Scan Next Visitor
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scan prompt */}
            {!entryScanning && !visitor && !approvedVisitor && (
              <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }} onClick={startEntryScanner}
                className="w-full py-16 border-2 border-dashed border-orange-300 rounded-3xl flex flex-col items-center gap-3 bg-orange-50/50 hover:bg-orange-50 transition-colors mt-4">
                <span className="text-6xl">📷</span>
                <p className="text-xl font-bold text-orange-700">Tap to Scan QR</p>
                <p className="text-sm text-orange-400">Point camera at visitor's QR code</p>
              </motion.button>
            )}

            {/* Visitor card */}
            <AnimatePresence>
              {visitor && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                  {visitor.photoUrl && <img src={visitor.photoUrl} alt="Visitor" className="w-full h-48 object-cover" />}
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">{visitor.fullName}</h3>
                        <p className="text-slate-500 text-sm">{visitor.company || 'Individual'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[visitor.status]}`}>
                        {visitor.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <InfoRow icon="📞" label="Phone" value={visitor.phone} />
                      <InfoRow icon="📧" label="Email" value={visitor.email || '—'} />
                      <InfoRow icon="🎯" label="Purpose" value={visitor.purpose} />
                      <InfoRow icon="👤" label="Host" value={visitor.host || '—'} />
                      <InfoRow icon="📅" label="Date" value={visitor.date} />
                      {visitor.checkInTime && <InfoRow icon="🕐" label="Check-in" value={new Date(visitor.checkInTime).toLocaleTimeString()} />}
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {visitor.status === 'pending' && <>
                        <ActionBtn color="green" icon="✅" label="Approve Entry" loading={loadingAction === 'approve'} onClick={() => action('approve')} />
                        <ActionBtn color="red" icon="❌" label="Decline" loading={loadingAction === 'decline'} onClick={() => action('decline')} />
                      </>}
                      {visitor.status === 'checked-in' && <>
                        <ActionBtn color="blue" icon="🚪" label="Check Out" loading={loadingAction === 'checkout'} onClick={() => action('checkout')} />
                        <ActionBtn color="orange" icon="🚩" label="Flag" loading={loadingAction === 'flag'} onClick={() => action('flag')} />
                      </>}
                      {['checked-out', 'declined', 'flagged'].includes(visitor.status) && (
                        <p className="col-span-2 text-center text-slate-400 text-sm py-2">No further actions available.</p>
                      )}
                    </div>
                    <button onClick={() => setVisitor(null)}
                      className="w-full py-2 text-sm text-orange-500 hover:text-orange-700 font-semibold transition-colors">
                      ← Scan another visitor
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── SCANNED TAB ── */}
        {tab === 'scanned' && (
          <div className="space-y-3 mt-2">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Scanned Visitors</h2>
              <button onClick={fetchScanned} className="text-xs text-orange-500 font-semibold hover:underline">🔄 Refresh</button>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2 text-xs text-blue-700 font-medium">
              🆕 Visitors who submitted QR — approve or decline without scanning
            </div>

            {scannedLoading && (
              <div className="text-center py-10">
                <div className="w-8 h-8 border-4 border-orange-300 border-t-orange-500 rounded-full animate-spin mx-auto" />
              </div>
            )}

            {/* Detail modal */}
            <AnimatePresence>
              {scannedDetail && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                  {scannedDetail.photoUrl && <img src={scannedDetail.photoUrl} alt="Visitor" className="w-full h-44 object-cover" />}
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">{scannedDetail.fullName}</h3>
                        <p className="text-slate-500 text-sm">{scannedDetail.company || 'Individual'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[scannedDetail.status]}`}>
                        {scannedDetail.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <InfoRow icon="📞" label="Phone" value={scannedDetail.phone} />
                      <InfoRow icon="🎯" label="Purpose" value={scannedDetail.purpose} />
                      <InfoRow icon="👤" label="Host" value={scannedDetail.host || '—'} />
                      <InfoRow icon="📅" label="Date" value={scannedDetail.date} />
                      {scannedDetail.geoLocation?.lat && (
                        <div className={`col-span-2 rounded-xl p-3 border ${
                          scannedDetail.geoLocation.isInsidePremises
                            ? 'bg-green-50 border-green-100'
                            : 'bg-orange-50 border-orange-200'
                        }`}>
                          <p className={`text-xs font-semibold ${scannedDetail.geoLocation.isInsidePremises ? 'text-green-600' : 'text-orange-600'}`}>
                            {scannedDetail.geoLocation.isInsidePremises ? '✅ Inside office premises' : '⚠️ Outside office premises'}
                          </p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {scannedDetail.geoLocation.lat.toFixed(5)}, {scannedDetail.geoLocation.lng.toFixed(5)}
                            {scannedDetail.geoLocation.lastVerified && ` · ${new Date(scannedDetail.geoLocation.lastVerified).toLocaleTimeString()}`}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <ActionBtn color="green" icon="✅" label="Approve Entry" loading={scannedAction === scannedDetail._id + 'approve'} onClick={() => scannedDoAction('approve', scannedDetail)} />
                      <ActionBtn color="red" icon="❌" label="Decline" loading={scannedAction === scannedDetail._id + 'decline'} onClick={() => scannedDoAction('decline', scannedDetail)} />
                    </div>
                    <button onClick={() => setScannedDetail(null)}
                      className="w-full py-2 text-sm text-orange-500 hover:text-orange-700 font-semibold">
                      ← Back to list
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!scannedLoading && !scannedDetail && (
              scanned.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <p className="text-4xl mb-3">🆕</p>
                  <p className="font-semibold">No pending scanned visitors</p>
                </div>
              ) : scanned.map(v => (
                <motion.div key={v._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 cursor-pointer hover:border-orange-200 transition-colors"
                  onClick={() => setScannedDetail(v)}>
                  {v.photoUrl
                    ? <img src={v.photoUrl} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" alt="" />
                    : <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-lg font-bold text-orange-600 flex-shrink-0">{v.fullName[0]}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{v.fullName}</p>
                    <p className="text-xs text-slate-500">{v.purpose} · {v.host || 'No host'}</p>
                    <p className="text-xs text-slate-400">{v.date} · {v.phone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">PENDING</span>
                    {v.geoLocation?.lat && (
                      <span className={`text-xs font-semibold ${
                        v.geoLocation.isInsidePremises ? 'text-green-500' : 'text-orange-500'
                      }`}>
                        {v.geoLocation.isInsidePremises ? '✅ inside' : '⚠️ outside'}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* ── VERIFY TAB ── */}
        {tab === 'verify' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-sm text-blue-700 font-medium">
              🔍 Scan a visitor's QR to verify their identity during office hours
            </div>

            {/* Verify scanner div always in DOM */}
            <div className={verifyScanning ? 'block' : 'hidden'}>
              <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-slate-100">
                <div id="verify-qr-reader" className="w-full" />
                <button onClick={stopVerifyScanner}
                  className="w-full py-3 text-sm text-slate-500 hover:text-red-500 font-semibold transition-colors border-t border-slate-100">
                  ✕ Cancel
                </button>
              </div>
            </div>

            {verifyLoading && (
              <div className="text-center py-10 text-slate-400">
                <div className="w-10 h-10 border-4 border-orange-300 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium">Verifying identity...</p>
              </div>
            )}

            {!verifyScanning && !verifiedVisitor && !verifyLoading && (
              <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }} onClick={startVerifyScanner}
                className="w-full py-16 border-2 border-dashed border-blue-300 rounded-3xl flex flex-col items-center gap-3 bg-blue-50/50 hover:bg-blue-50 transition-colors mt-4">
                <span className="text-6xl">🔍</span>
                <p className="text-xl font-bold text-blue-700">Tap to Verify Visitor</p>
                <p className="text-sm text-blue-400">Scan QR to confirm identity</p>
              </motion.button>
            )}

            <AnimatePresence>
              {verifiedVisitor && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                  {verifiedVisitor.photoUrl && (
                    <div className="relative">
                      <img src={verifiedVisitor.photoUrl} alt="Visitor" className="w-full h-52 object-cover" />
                      {/* Verified badge overlay */}
                      <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                        <span>✓</span> VERIFIED
                      </div>
                    </div>
                  )}

                  <div className="p-6 space-y-4">
                    {/* Verified banner */}
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">✅</div>
                      <div>
                        <p className="font-bold text-green-800 text-sm">Identity Verified</p>
                        <p className="text-xs text-green-600">Verified by {user?.name} at {new Date().toLocaleTimeString()}</p>
                      </div>
                    </div>

                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">{verifiedVisitor.fullName}</h3>
                        <p className="text-slate-500 text-sm">{verifiedVisitor.company || 'Individual'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[verifiedVisitor.status]}`}>
                        {verifiedVisitor.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <InfoRow icon="📞" label="Phone" value={verifiedVisitor.phone} />
                      <InfoRow icon="📧" label="Email" value={verifiedVisitor.email || '—'} />
                      <InfoRow icon="🎯" label="Purpose" value={verifiedVisitor.purpose} />
                      <InfoRow icon="👤" label="Host" value={verifiedVisitor.host || '—'} />
                      <InfoRow icon="📅" label="Visit Date" value={verifiedVisitor.date} />
                      <InfoRow icon="🕐" label="Check-in" value={verifiedVisitor.checkInTime ? new Date(verifiedVisitor.checkInTime).toLocaleTimeString() : '—'} />
                      {verifiedVisitor.address && <InfoRow icon="📍" label="Address" value={verifiedVisitor.address} />}
                      <InfoRow icon="🆔" label="Visitor ID" value={verifiedVisitor.visitorId?.slice(0, 8) + '...'} />
                    </div>

                    {/* Status warning if not checked-in */}
                    {verifiedVisitor.status !== 'checked-in' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2">
                        <span className="text-yellow-500">⚠️</span>
                        <p className="text-xs text-yellow-700 font-medium">
                          This visitor is <strong>{verifiedVisitor.status}</strong> — not currently checked in
                        </p>
                      </div>
                    )}

                    <button onClick={() => setVerifiedVisitor(null)}
                      className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                      🔍 Verify Another
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── ROSTER TAB ── */}
        {tab === 'roster' && (
          <div className="space-y-3 mt-2">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Currently Inside</h2>
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">{roster.length} visitors</span>
            </div>
            {roster.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-4xl mb-3">🏢</p>
                <p className="font-semibold">No visitors inside</p>
              </div>
            ) : roster.map(v => (
              <motion.div key={v._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
                {v.photoUrl
                  ? <img src={v.photoUrl} className="w-12 h-12 rounded-xl object-cover" alt="" />
                  : <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-xl">👤</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{v.fullName}</p>
                  <p className="text-xs text-slate-500">{v.purpose} · {v.host || 'No host'}</p>
                  <p className="text-xs text-green-600 font-medium">In since {new Date(v.checkInTime).toLocaleTimeString()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── RECENT TAB ── */}
        {tab === 'recent' && (
          <div className="space-y-3 mt-2">
            <h2 className="font-bold text-slate-800">Recent Visitors</h2>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <input type="date" value={recentDate}
                onChange={e => { setRecentDate(e.target.value); setRecentPage(1); fetchRecent(1, e.target.value, recentStatus); }}
                className="flex-1 min-w-32 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500" />
              <select value={recentStatus}
                onChange={e => { setRecentStatus(e.target.value); setRecentPage(1); fetchRecent(1, recentDate, e.target.value); }}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-orange-500">
                <option value="">All Status</option>
                {['pending','checked-in','checked-out','declined','flagged'].map(s => <option key={s}>{s}</option>)}
              </select>
              {(recentDate || recentStatus) && (
                <button onClick={() => { setRecentDate(''); setRecentStatus(''); setRecentPage(1); fetchRecent(1, '', ''); }}
                  className="px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-xl">
                  ✕ Clear
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{recentTotal} record{recentTotal !== 1 ? 's' : ''}</span>
            </div>

            {recent.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-semibold">No recent visitors</p>
              </div>
            ) : recent.map(v => (
              <div key={v._id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                {v.photoUrl
                  ? <img src={v.photoUrl} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="" />
                  : <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 flex-shrink-0">{v.fullName[0]}</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{v.fullName}</p>
                  <p className="text-xs text-slate-500">{v.phone} · {v.purpose}</p>
                  <p className="text-xs text-slate-400">{v.date}{v.checkInTime ? ` · In: ${new Date(v.checkInTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}` : ''}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold flex-shrink-0 ${STATUS_COLORS[v.status]}`}>{v.status}</span>
              </div>
            ))}

            {/* Pagination */}
            {recentPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button disabled={recentPage === 1}
                  onClick={() => { const p = recentPage - 1; setRecentPage(p); fetchRecent(p, recentDate, recentStatus); }}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white rounded-xl border border-slate-200 disabled:opacity-40">
                  ← Prev
                </button>
                <span className="text-xs text-slate-500">Page {recentPage} of {recentPages}</span>
                <button disabled={recentPage === recentPages}
                  onClick={() => { const p = recentPage + 1; setRecentPage(p); fetchRecent(p, recentDate, recentStatus); }}
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

const InfoRow = ({ icon, label, value }) => (
  <div className="bg-slate-50 rounded-xl p-3">
    <p className="text-xs text-slate-400 mb-0.5">{icon} {label}</p>
    <p className="font-semibold text-slate-700 truncate text-sm">{value}</p>
  </div>
);

const ActionBtn = ({ color, icon, label, loading, onClick }) => {
  const colors = {
    green: 'bg-green-500 hover:bg-green-600 shadow-green-200',
    red: 'bg-red-500 hover:bg-red-600 shadow-red-200',
    blue: 'bg-blue-500 hover:bg-blue-600 shadow-blue-200',
    orange: 'bg-orange-500 hover:bg-orange-600 shadow-orange-200',
  };
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick} disabled={loading}
      className={`py-3 ${colors[color]} text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-60 text-sm`}>
      {loading ? '...' : `${icon} ${label}`}
    </motion.button>
  );
};
