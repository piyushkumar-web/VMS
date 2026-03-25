import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './Components/ui/ProtectedRoute';
import EntryForm from './Components/EntryForm';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import GuardPanel from './pages/guard/GuardPanel';
import PassForm from './pages/PassForm';
import PassLogin from './pages/PassLogin';
import SetPassword from './pages/SetPassword';
import PassUserPanel from './pages/PassUserPanel';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: '12px', background: '#1e293b', color: '#fff', fontSize: '14px' },
            success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/visitor" element={<EntryForm />} />
          <Route path="/pass/request" element={<PassForm />} />
          <Route path="/pass/login" element={<PassLogin />} />
          <Route path="/pass/verify/:token" element={<SetPassword />} />
          <Route path="/pass/dashboard" element={<PassUserPanel />} />
          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/guard" element={
            <ProtectedRoute role="guard"><GuardPanel /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
