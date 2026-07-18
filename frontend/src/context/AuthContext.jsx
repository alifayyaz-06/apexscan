import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { API_URL } from '../utils/config';

const BACKEND_URL = API_URL;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { email, role, restaurantId, restaurantName, displayName, ... }
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);  // Initial session restore
  const [isExpired, setIsExpired] = useState(false);

  // ─── Restore session from localStorage on mount ───
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      // 1. Check if there is an active session from Supabase client (e.g. OAuth callback redirect)
      const { data: { session: oauthSession } } = await supabase.auth.getSession();
      if (oauthSession) {
        const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
          headers: { 'Authorization': `Bearer ${oauthSession.access_token}` }
        });
        if (res.ok) {
          const result = await res.json();
          setToken(oauthSession.access_token);
          setUser({
            ...result.data,
            token: oauthSession.access_token,
          });
          saveSession(oauthSession.access_token, result.data.role === 'super_admin' ? 'super' : 'admin');
          setLoading(false);
          return;
        }
      }

      // 2. Fallback to localStorage session
      const stored = localStorage.getItem('smartqr_session');
      if (!stored) {
        setLoading(false);
        return;
      }

      const session = JSON.parse(stored);

      // Validate the token is still good via /auth/me
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });

      if (res.ok) {
        const result = await res.json();
        setToken(session.token);
        setUser({
          ...result.data,
          token: session.token,
        });
      } else {
        const errorBody = await res.json().catch(() => ({}));
        if (errorBody.code === 'SUBSCRIPTION_EXPIRED') {
          setIsExpired(true);
          setLoading(false);
          return;
        }
        // Token expired or invalid — try Supabase session refresh for admins
        if (session.authType === 'admin' || session.authType === 'super') {
          const { data: { session: newSession } } = await supabase.auth.getSession();
          if (newSession) {
            const meRes = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
              headers: { 'Authorization': `Bearer ${newSession.access_token}` }
            });
            if (meRes.ok) {
              const result = await meRes.json();
              const newToken = newSession.access_token;
              setToken(newToken);
              setUser({ ...result.data, token: newToken });
              saveSession(newToken, session.authType);
            } else {
              clearSession();
            }
          } else {
            clearSession();
          }
        } else {
          clearSession();
        }
      }
    } catch (err) {
      console.error('Session restore failed:', err);
      clearSession();
    }
    setLoading(false);
  };

  // ─── Google Login (Super Admin) ───
  const googleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/super`
      }
    });
    if (error) throw error;
    // The page redirects — on return, Supabase sets the session cookie
  };

  // Handle Google OAuth callback (called on /super page load)
  const handleGoogleCallback = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const accessToken = session.access_token;
      
      // Verify with backend
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data.role === 'super_admin') {
          setToken(accessToken);
          setUser({
            email: session.user.email,
            role: 'super_admin',
            displayName: session.user.email,
            restaurantId: null,
            restaurantName: 'Platform Admin',
          });
          saveSession(accessToken, 'super');
          return true;
        }
      }
    } catch (err) {
      console.error('OAuth callback verification error:', err);
    }

    // Sign out unauthorized users
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    clearSession();
    return false;
  };

  const adminLogin = async (email, password) => {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const result = await res.json();
    if (!result.success) {
      if (result.code === 'SUBSCRIPTION_EXPIRED') {
        setIsExpired(true);
      }
      const err = new Error(result.message);
      err.code = result.code;
      throw err;
    }

    const { token: newToken, user: userData } = result.data;
    setToken(newToken);
    setUser({ ...userData, displayName: userData.email });
    saveSession(newToken, 'admin');
    return userData;
  };

  const adminSignup = async (email, password) => {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/admin/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);
    return result;
  };

  // ─── Staff Login (Employee Code/Password) ───
  const staffLogin = async (username, password, adminEmail) => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('restaurant') || localStorage.getItem('ordering_restaurant');

    const res = await fetch(`${BACKEND_URL}/api/v1/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        employeeCode: username, 
        password, 
        restaurantSlug: slug || undefined, 
        adminEmail: adminEmail || undefined 
      })
    });
    const result = await res.json();
    if (!result.success) {
      if (result.code === 'SUBSCRIPTION_EXPIRED') {
        setIsExpired(true);
      }
      throw new Error(result.message);
    }

    const { token: newToken, user: userData } = result.data;
    setToken(newToken);
    setUser({ ...userData });
    saveSession(newToken, 'staff');
    return userData;
  };

  // ─── Logout ───
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    clearSession();
  };

  // ─── Helpers ───
  const saveSession = (tokenVal, authType) => {
    localStorage.setItem('smartqr_session', JSON.stringify({ token: tokenVal, authType }));
  };

  const clearSession = () => {
    localStorage.removeItem('smartqr_session');
    setUser(null);
    setToken(null);
  };

  // Convenience: returns headers object for fetch calls
  const authHeaders = () => {
    if (!token) return {};
    return { 'Authorization': `Bearer ${token}` };
  };

  const value = {
    user,
    token,
    loading,
    isExpired,
    isAuthenticated: !!user,
    googleLogin,
    handleGoogleCallback,
    adminLogin,
    adminSignup,
    staffLogin,
    logout,
    authHeaders,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
