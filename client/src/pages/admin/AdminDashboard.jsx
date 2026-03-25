import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Overview from './Overview';
import Visitors from './Visitors';
import Guards from './Guards';
import BlacklistPanel from './BlacklistPanel';
import LogsPanel from './LogsPanel';
import PassPanel from './PassPanel';

const NAV = [
  { id: 'overview',  icon: '📊', label: 'Overview' },
  { id: 'visitors',  icon: '👥', label: 'Visitors' },
  { id: 'passes',    icon: '🎫', label: 'Passes' },
  { id: 'guards',    icon: '🛡️', label: 'Guards' },
  { id: 'blacklist', icon: '🚫', label: 'Blacklist' },
  { id: 'logs',      icon: '📋', label: 'Audit Logs' },
];

const PANELS = { overview: Overview, visitors: Visitors, passes: PassPanel, guards: Guards, blacklist: BlacklistPanel, logs: LogsPanel };

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const Panel = PANELS[active];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-100 flex flex-col shadow-xl lg:shadow-none transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Brand */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200 flex-shrink-0">
              <span className="text-white text-lg">🏢</span>
            </div>
            <div>
              <h1 className="font-black text-slate-800 text-sm">VMS Admin</h1>
              <p className="text-xs text-slate-400">Control Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setActive(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                active === item.id
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </motion.button>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-md shadow-orange-200 flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-700 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { logout(); navigate('/'); }}
            className="w-full py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span>🚪</span> Sign Out
          </motion.button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 sm:px-6 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
          >
            <span className="text-xl">☰</span>
          </motion.button>
          <div className="flex items-center gap-2">
            <span className="text-lg">{NAV.find(n => n.id === active)?.icon}</span>
            <h2 className="font-black text-slate-800 capitalize text-sm sm:text-base">{NAV.find(n => n.id === active)?.label}</h2>
          </div>
          <div className="ml-auto hidden sm:block text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Panel />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
