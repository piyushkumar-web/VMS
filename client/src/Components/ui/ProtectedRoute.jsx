import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/guard'} replace />;
  return children;
};
