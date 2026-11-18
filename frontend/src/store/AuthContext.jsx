import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../services/api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) { setLoading(false); return; }
    api.get('/auth/me').then((d) => setUser(d.user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, [logout]);

  const signIn = (data) => { setToken(data.token); setUser(data.user); };

  return <Ctx.Provider value={{ user, loading, signIn, logout, isAdmin: user?.role === 'admin', isOwner: user?.role === 'admin' }}>{children}</Ctx.Provider>;
}
