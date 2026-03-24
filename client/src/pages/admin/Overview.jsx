import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import api from '../../api/axios';

const today = () => new Date().toISOString().split('T')[0];
const PIE_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

const STAT_CONFIG = [
  { key: 'total',      icon: '👥', label: 'Total',       gradient: 'from-blue-500 to-blue-600',     shadow: 'shadow-blue-200',   light: 'bg-blue-50 text-blue-600' },
  { key: 'checkedIn',  icon: '🏢', label: 'Inside Now',  gradient: 'from-emerald-500 to-emerald-600',shadow: 'shadow-emerald-200',light: 'bg-emerald-50 text-emerald-600' },
  { key: 'checkedOut', icon: '🚪', label: 'Checked Out', gradient: 'from-slate-500 to-slate-600',   shadow: 'shadow-slate-200',  light: 'bg-slate-100 text-slate-600' },
  { key: 'pending',    icon: '⏳', label: 'Pending',     gradient: 'from-amber-500 to-amber-600',   shadow: 'shadow-amber-200',  light: 'bg-amber-50 text-amber-600' },
  { key: 'declined',   icon: '❌', label: 'Declined',    gradient: 'from-red-500 to-red-600',       shadow: 'shadow-red-200',    light: 'bg-red-50 text-red-600' },
  { key: 'flagged',    icon: '🚩', label: 'Flagged',     gradient: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-200', light: 'bg-orange-50 text-orange-600' },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: i => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

function StatCard({ icon, label, value, gradient, shadow, light, isToday, index }) {
  return (
    <motion.div
      custom={index} variants={cardVariants} initial="hidden" animate="visible"
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`relative bg-white rounded-2xl p-4 sm:p-5 shadow-md ${shadow} border border-slate-100 overflow-hidden cursor-default`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 hover:opacity-5 transition-opacity duration-300`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${light} shadow-sm`}>{icon}</div>
        {isToday && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">LIVE</span>}
      </div>
      <p className="text-2xl sm:text-3xl font-black text-slate-800 leading-none mb-1">
        {value != null ? value : <span className="text-slate-200">—</span>}
      </p>
      <p className="text-xs text-slate-400 font-semibold">{label}</p>
    </motion.div>
  );
}

function MetaCard({ icon, label, value, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <p className="text-xs text-slate-400 mb-1.5 font-medium">{icon} {label}</p>
      <p className="font-black text-slate-800 text-sm">{value || '—'}</p>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-xl px-4 py-2.5 text-sm">
      <p className="font-semibold text-slate-600 text-xs mb-0.5">{label}</p>
      <p className="text-orange-500 font-black">{payload[0].value} <span className="font-normal text-slate-400">visitors</span></p>
    </div>
  );
};

export default function Overview() {
  const [monthly, setMonthly]         = useState([]);
  const [purposes, setPurposes]       = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [dayDate, setDayDate]         = useState(today());
  const [dayStats, setDayStats]       = useState(null);
  const [dayHourly, setDayHourly]     = useState([]);
  const [dayLoading, setDayLoading]   = useState(false);

  const fetchGlobal = useCallback(async () => {
    const [m, p] = await Promise.all([api.get('/visitors/stats/monthly'), api.get('/visitors/stats/purposes')]);
    setMonthly(m.data); setPurposes(p.data); setLastRefresh(new Date());
  }, []);

  const fetchDay = useCallback(async (date) => {
    setDayLoading(true);
    try {
      const [ds, dh] = await Promise.all([api.get(`/visitors/stats/day?date=${date}`), api.get(`/visitors/stats/hourly?date=${date}`)]);
      setDayStats(ds.data); setDayHourly(dh.data);
    } finally { setDayLoading(false); }
  }, []);

  useEffect(() => { fetchGlobal(); const t = setInterval(fetchGlobal, 60000); return () => clearInterval(t); }, [fetchGlobal]);
  useEffect(() => { fetchDay(dayDate); }, [dayDate, fetchDay]);

  const isToday = dayDate === today();

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">Updated {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <motion.button whileTap={{ scale: 0.93 }} onClick={() => { fetchGlobal(); fetchDay(dayDate); }}
          className="flex items-center gap-1.5 text-xs text-orange-500 font-bold px-3 py-2 rounded-xl hover:bg-orange-50 border border-orange-100 transition-all shadow-sm">
          ↻ Refresh
        </motion.button>
      </div>

      {/* Day analysis card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
        {/* Card header */}
        <div className="px-4 sm:px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200 flex-shrink-0">
              <span className="text-white text-lg">📊</span>
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm sm:text-base">
                {isToday ? "Today's Overview" : `${new Date(dayDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </h3>
              {isToday
                ? <p className="text-xs text-emerald-500 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" /> Live data</p>
                : <p className="text-xs text-slate-400">Historical snapshot</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={dayDate} max={today()} onChange={e => setDayDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm w-full sm:w-auto" />
            {!isToday && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setDayDate(today())}
                className="text-xs font-bold text-orange-500 px-3 py-2 rounded-xl hover:bg-orange-50 border border-orange-100 transition-all whitespace-nowrap">
                Today
              </motion.button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {dayLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-24 shimmer rounded-2xl" />)}
            </div>
          ) : dayStats ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {STAT_CONFIG.map((c, i) => (
                  <StatCard key={c.key} index={i} icon={c.icon} label={c.label}
                    value={dayStats[c.key]} gradient={c.gradient} shadow={c.shadow} light={c.light} isToday={isToday} />
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetaCard icon="⏱️" label="Avg Duration" value={dayStats.avgMins != null ? `${dayStats.avgMins} min` : null} delay={0.1} />
                <MetaCard icon="🎯" label="Top Purpose" value={dayStats.topPurpose} delay={0.15} />
                <MetaCard icon="🌅" label="First Entry" value={dayStats.firstEntry} delay={0.2} />
                <MetaCard icon="🌆" label="Last Entry" value={dayStats.lastEntry} delay={0.25} />
              </div>

              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Hourly Traffic</p>
                {dayHourly.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-300 gap-2">
                    <span className="text-3xl">📭</span>
                    <p className="text-sm">No check-ins on this day</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={dayHourly} margin={{ top: 4, right: 0, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#fff7ed', radius: 6 }} />
                      <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={36}>
                        <defs>
                          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#fb923c" stopOpacity={0.7} />
                          </linearGradient>
                        </defs>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          ) : null}
        </div>
      </motion.div>

      {/* Monthly + Purposes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
          className="bg-white rounded-3xl p-4 sm:p-6 shadow-md border border-slate-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-lg shadow-sm">📈</div>
            <div>
              <h3 className="font-black text-slate-800 text-sm">Monthly Trend</h3>
              <p className="text-xs text-slate-400">Last 6 months</p>
            </div>
          </div>
          {monthly.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-slate-300 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthly} margin={{ top: 4, right: 10, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={3}
                  dot={{ fill: '#fff', stroke: '#f97316', strokeWidth: 2.5, r: 5 }}
                  activeDot={{ r: 7, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-white rounded-3xl p-4 sm:p-6 shadow-md border border-slate-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center text-lg shadow-sm">🎯</div>
            <div>
              <h3 className="font-black text-slate-800 text-sm">Visit Purposes</h3>
              <p className="text-xs text-slate-400">All-time breakdown</p>
            </div>
          </div>
          {purposes.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-slate-300 text-sm">No data yet</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={purposes} dataKey="count" nameKey="purpose" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}>
                    {purposes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 w-full sm:min-w-36">
                {purposes.map((p, i) => (
                  <div key={p.purpose} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-slate-600 flex-1 truncate">{p.purpose}</span>
                    <span className="text-xs font-black text-slate-800">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
