import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, clearCustomerToken, getCustomerToken, setCustomerToken } from "../api";

/*
  Who is the shopper? `user` is null for guests and an object
  { id, name, email, lastShipping } once signed in. Any component can call
  useAuth() to read it or to sign in/out — same Context pattern as the cart.

  The login token lives in localStorage (see api.js). On page load we ask the
  server "who does this token belong to?" (/api/account/me/). If the server says
  401 the token is stale, so we forget it and treat the visitor as a guest.
*/
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getCustomerToken()));

  const refreshUser = useCallback(async () => {
    if (!getCustomerToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await api.getMe());
    } catch (err) {
      if (err.status === 401) clearCustomerToken(); // expired/invalid token
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    const { token, user: me } = await api.loginCustomer(email, password);
    setCustomerToken(token);
    setUser(me);
  };

  const register = async (name, email, password) => {
    const { token, user: me } = await api.register(name, email, password);
    setCustomerToken(token);
    setUser(me);
  };

  const logout = async () => {
    try {
      await api.logoutCustomer(); // tell the server to kill the token
    } catch {
      // even if that fails (offline...), sign out locally
    }
    clearCustomerToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
