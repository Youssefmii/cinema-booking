import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cinema_user')); } catch { return null; }
  });
  const [isBlacklisted, setIsBlacklisted] = useState(false);

  // Fetch fresh blacklist status whenever user changes (login/logout/session restore)
  useEffect(() => {
    const token = localStorage.getItem('cinema_token');
    if (!token) { setIsBlacklisted(false); return; }
    axios.get('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setIsBlacklisted(!!res.data.is_blacklisted))
      .catch(() => setIsBlacklisted(false));
  }, [user?.id]);

  const login = (token, userData) => {
    localStorage.setItem('cinema_token', token);
    localStorage.setItem('cinema_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('cinema_token');
    localStorage.removeItem('cinema_user');
    setUser(null);
    setIsBlacklisted(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin', isBlacklisted }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
