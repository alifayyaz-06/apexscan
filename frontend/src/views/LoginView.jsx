import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { API_URL } from '../utils/config';

export default function LoginView() {
  const { googleLogin, adminLogin, adminSignup, staffLogin } = useAuth();
  
  // 1. Detect dynamic restaurant slug from path prefix (e.g. /r/kfc/login)
  const pathMatch = window.location.pathname.match(/^\/r\/([^/]+)/);
  const currentSlug = pathMatch ? pathMatch[1] : null;

  // 1b. Detect if this is the Platform Owner's private login route
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const isOwnerRoute = path === '/owner' || path === '/super';

  // Parse query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const isLaunchpad = searchParams.get('source') === 'launchpad';
  const urlTab = searchParams.get('tab');

  // 2. Set default active tab based on the URL path & query parameters
  const [activeTab, setActiveTab] = useState(() => {
    if (isOwnerRoute) return 'super';
    if (isLaunchpad) return 'staff';
    if (urlTab === 'admin') return 'admin';
    if (urlTab === 'staff') return 'staff';
    return 'staff';
  });
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [staffPass, setStaffPass] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [isOwnerSignup, setIsOwnerSignup] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantLogo, setRestaurantLogo] = useState('');

  // Fallback email login toggle for super admins when Google OAuth is not configured
  const [showOwnerEmailLogin, setShowOwnerEmailLogin] = useState(false);

  useEffect(() => {
    if (isLaunchpad) {
      setActiveTab('staff');
    } else {
      setActiveTab(isOwnerRoute ? 'super' : (urlTab === 'admin' ? 'admin' : 'staff'));
    }
  }, [isOwnerRoute, isLaunchpad, urlTab]);

  useEffect(() => {
    if (currentSlug) {
      fetch(`${API_URL}/api/v1/restaurants/public/${currentSlug}`)
        .then(res => res.json())
        .then(result => {
          if (result.success && result.data) {
            setRestaurantName(result.data.name);
            setRestaurantLogo(result.data.logo_url || '');
          }
        })
        .catch(err => console.error('Error fetching public restaurant details:', err));
    }
  }, [currentSlug]);

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await googleLogin();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (isSignup) {
        await adminSignup(email, password);
        setSuccess('Account created successfully! You can now log in.');
        setIsSignup(false);
      } else {
        const userData = await adminLogin(email, password);
        window.location.href = currentSlug ? `/r/${currentSlug}/admin` : '/admin';
      }
    } catch (err) {
      setError(err.message);
      if (err.code === 'FIRST_TIME_SETUP') {
        const targetUrl = currentSlug 
          ? `/r/${currentSlug}/forgot-password?email=${encodeURIComponent(email)}&step=2` 
          : `/forgot-password?email=${encodeURIComponent(email)}&step=2`;
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 2500);
      }
    }
    setLoading(false);
  };

  // Submit owner fallback credentials
  const handleOwnerEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (isOwnerSignup) {
        await adminSignup(email, password);
        setSuccess('Platform Owner account registered! You can now log in.');
        setIsOwnerSignup(false);
      } else {
        await adminLogin(email, password);
        window.location.href = '/super';
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await staffLogin(username, staffPass, email);
      const targetSlug = userData?.restaurantSlug || currentSlug;

      if (userData.role === 'kitchen_staff') {
        window.location.href = targetSlug ? `/r/${targetSlug}/kitchen` : '/kitchen';
      } else if (userData.role === 'waiter') {
        window.location.href = targetSlug ? `/r/${targetSlug}/waiter-pos` : '/waiter-pos';
      } else {
        window.location.href = targetSlug ? `/r/${targetSlug}/waiter` : '/waiter';
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Filter tabs so super admin is completely hidden on public /login
  const publicTabs = [
    { key: 'admin', label: '🏪 Restaurant Admin', desc: 'Manage your restaurant' },
    { key: 'staff', label: '👨‍🍳 Kitchen / Sales Staff', desc: 'Access terminal credentials' },
  ];

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          {restaurantLogo ? (
            <img src={restaurantLogo} className="h-16 w-auto object-contain rounded-2xl mb-3 shadow-[0_4px_12px_rgba(0,0,0,0.02)] border border-slate-100 p-1.5 bg-white" alt={restaurantName} />
          ) : null}
          <h1 className="text-4xl font-black text-[#2B2D42] leading-none mb-2">
            {restaurantName ? (
              <span className="text-2xl font-black tracking-tight">{restaurantName}</span>
            ) : (
              <>
                <span className="font-playwrite text-[#2B2D42]">Gourmet</span>
                <span className="font-playwrite text-[#E63946]">Bistro</span>
              </>
            )}
          </h1>
          <p className="text-slate-400 text-sm">
            {restaurantName ? 'Staff Login Terminal' : 'Apex Scan Platform'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.035)] overflow-hidden">
          {/* Tab Switcher - only show if NOT owner route and NOT launchpad */}
          {!isOwnerRoute && !isLaunchpad ? (
            <div className="flex border-b border-slate-100">
              {publicTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setError('');
                    setSuccess('');
                  }}
                  className={`flex-1 py-4 text-xs font-bold transition-all border-b-2 ${
                    activeTab === tab.key
                      ? 'text-[#E63946] border-[#E63946] bg-red-50/30'
                      : 'text-slate-400 border-transparent hover:text-[#2B2D42]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="border-b border-slate-100 py-4 px-6 text-center bg-slate-50">
              <span className="text-xs font-black uppercase text-[#E63946] tracking-widest">
                {isLaunchpad ? '⚡ Terminal Shift Authorization' : '🔑 Platform Control Center'}
              </span>
            </div>
          )}

          <div className="p-8">
            {/* Error / Success Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-xl mb-5 animate-fade-in">
                ❌ {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm font-medium px-4 py-3 rounded-xl mb-5 animate-fade-in">
                ✅ {success}
              </div>
            )}

            {/* ─── Super Admin: Google OAuth (Only rendered at /owner or /super) ─── */}
            {isOwnerRoute && activeTab === 'super' && (
              <div className="animate-fade-in">
                {!showOwnerEmailLogin ? (
                  <div className="flex flex-col items-center gap-6 py-4">
                    <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center text-3xl">
                      🔑
                    </div>
                    <div className="text-center">
                      <h2 className="text-lg font-bold text-[#2B2D42] mb-1">Platform Owner Access</h2>
                      <p className="text-slate-400 text-xs">Sign in with your authorized Google account</p>
                    </div>
                    
                    <button
                      onClick={handleGoogleLogin}
                      className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-[#2B2D42] hover:border-[#E63946] hover:shadow-md transition-all"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Sign in with Google
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setShowOwnerEmailLogin(true);
                      }}
                      className="text-xs text-slate-400 hover:text-[#E63946] transition-colors mt-2"
                    >
                      ⚠️ Google Auth disabled in Supabase? Click here to use Email fallback
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleOwnerEmailSubmit} className="flex flex-col gap-5">
                    <div className="text-center mb-2">
                      <h2 className="text-lg font-bold text-[#2B2D42]">
                        {isOwnerSignup ? 'Set Platform Owner Password' : 'Platform Owner Fallback'}
                      </h2>
                      <p className="text-slate-400 text-xs mt-1">
                        {isOwnerSignup 
                          ? 'Register your admin credentials to activate control center' 
                          : 'Sign in with your registered admin email & password'}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Admin Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="e.g. admin@platform.com"
                        className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Password</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-3 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#E63946]/20 disabled:bg-slate-300"
                    >
                      {loading ? 'Processing...' : isOwnerSignup ? 'Set Password & Register' : 'Sign In as Owner'}
                    </button>

                    <div className="flex flex-col gap-2.5 text-center mt-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsOwnerSignup(!isOwnerSignup);
                          setError('');
                          setSuccess('');
                        }}
                        className="text-xs text-[#E63946] hover:text-[#FF6B35] font-bold transition-colors"
                      >
                        {isOwnerSignup ? '← Back to Owner Login' : 'First time owner? Click here to set password'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setSuccess('');
                          setShowOwnerEmailLogin(false);
                        }}
                        className="text-xs text-slate-400 hover:text-[#2B2D42] transition-colors"
                      >
                        ← Back to Google Auth
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ─── Admin: Email/Password ─── */}
            {!isOwnerRoute && activeTab === 'admin' && (
              <form onSubmit={handleAdminSubmit} className="flex flex-col gap-5 animate-fade-in">
                <div className="text-center mb-2">
                  <h2 className="text-lg font-bold text-[#2B2D42]">
                    {isSignup 
                      ? 'Set Your Password' 
                      : (restaurantName ? `${restaurantName} Admin Login` : 'Restaurant Admin Login')}
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    {isSignup 
                      ? 'Create your credentials using the email registered by the Platform Owner' 
                      : 'Access your restaurant management panel'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. manager@restaurant.com"
                    className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#E63946]/20 disabled:bg-slate-350"
                >
                  {loading ? 'Processing...' : isSignup ? 'Set Password & Login' : 'Sign In'}
                </button>

                {!isSignup && (
                  <>
                    <div className="flex items-center my-2">
                      <div className="flex-grow border-t border-slate-100"></div>
                      <span className="px-3 text-xs text-slate-400 font-bold uppercase">or</span>
                      <div className="flex-grow border-t border-slate-100"></div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="w-full flex items-center justify-center gap-3 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-[#2B2D42] hover:border-[#E63946] hover:shadow-sm transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Sign in with Google
                    </button>
                  </>
                )}

                <div className="text-center mt-2 border-t border-slate-100 pt-4">
                  <a
                    href={currentSlug ? `/r/${currentSlug}/forgot-password` : '/forgot-password'}
                    className="text-xs text-[#E63946] hover:text-[#FF6B35] font-bold transition-colors"
                  >
                    First time? Click here to set your invited password
                  </a>
                </div>

                {!isSignup && (
                  <div className="text-center mt-1">
                    <a
                      href={currentSlug ? `/r/${currentSlug}/forgot-password` : '/forgot-password'}
                      className="text-xs text-slate-400 hover:text-[#E63946] transition-colors"
                    >
                      Forgot your password?
                    </a>
                  </div>
                )}
              </form>
            )}

            {/* ─── Staff: Employee Code/Password ─── */}
            {!isOwnerRoute && activeTab === 'staff' && (
              <form onSubmit={handleStaffSubmit} className="flex flex-col gap-5 animate-fade-in">
                <div className="text-center mb-2">
                  <h2 className="text-lg font-bold text-[#2B2D42]">
                    {restaurantName ? `${restaurantName} Terminal Sign In` : 'Staff Terminal Sign In'}
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">Enter your terminal credentials to begin shift</p>
                </div>

                {!currentSlug && (
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Parent Admin Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="e.g. manager@restaurant.com"
                      className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none transition-colors"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. chef001"
                    className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Shift Password</label>
                  <input
                    type="password"
                    required
                    value={staffPass}
                    onChange={e => setStaffPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#E63946]/20 disabled:bg-slate-350"
                >
                  {loading ? 'Verifying Shift...' : 'Start Shift'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
