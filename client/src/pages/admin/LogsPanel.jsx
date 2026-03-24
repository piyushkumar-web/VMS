import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../api/axios';

const ACTION_STYLES = {
  CHECK_IN:        'bg-emerald-100 text-emerald-700 border-emerald-200',
  CHECK_OUT:       'bg-blue-100 text-blue-700 border-blue-200',
  DECLINED:        'bg-red-100 text-red-700 border-red-200',
  FLAGGED:         'bg-orange-100 text-orange-700 border-orange-200',
  VERIFIED:        'bg-purple-100 text-purple-700 border-purple-200',
  MANUAL_TIME_EDIT:'bg-amber-100 text-amber-700 border-amber-200',
};

const ACTION_ICONS = {
  CHECK_IN: '✅', CHECK_OUT: '🚪', DECLINED: '❌',
  FLAGGED: '🚩', VERIFIED: '🔍', MANUAL_TIME_EDIT: '✏️',
};

export default function LogsPanel() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/logs').then(r => setLogs(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-lg shadow-sm">📋</div>
          <div>
            <h3 className="font-black text-slate-800">Audit Trail</h3>
            <p className="text-xs text-slate-400">Last 100 actions</p>
          </div>
        </div>
        {!loading && <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">{logs.length} entries</span>}
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-14 shimmer rounded-xl" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold">No audit logs yet</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {logs.map((log, i) => (
            <motion.div key={log._id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="px-4 sm:px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 border ${ACTION_STYLES[log.action] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {ACTION_ICONS[log.action] || '📝'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${ACTION_STYLES[log.action] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {log.action?.replace(/_/g,' ')}
                  </span>
                  <p className="text-sm font-bold text-slate-700 truncate">{log.visitorName || 'Unknown'}</p>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">by {log.performedByName || 'System'}{log.details ? ` · ${log.details}` : ''}</p>
              </div>
              <p className="text-xs text-slate-400 whitespace-nowrap hidden sm:block">{new Date(log.createdAt).toLocaleString()}</p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
