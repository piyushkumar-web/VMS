import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('vms_user');
    return u ? JSON.parse(u) : null;
  });

  const login = (token, userData) => {
    localStorage.setItem('vms_token', token);
    localStorage.setItem('vms_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('vms_token');
    localStorage.removeItem('vms_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
