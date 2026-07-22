import React, { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './utils/supabaseClient';
import LandingView from './views/LandingView';
import CustomerView from './views/CustomerView';
import WaiterView from './views/WaiterView';
import WaiterPosView from './views/WaiterPosView';
import KitchenView from './views/KitchenView';
import AdminView from './views/AdminView';
import LoginView from './views/LoginView';
import SuperAdminView from './views/SuperAdminView';
import ForgotPasswordView from './views/ForgotPasswordView';
import UpdatePasswordView from './views/UpdatePasswordView';
import AccountExpiredView from './views/AccountExpiredView';

function AppContent() {
  const { user, loading, isExpired } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch active restaurants for the lookup screen
  useEffect(() => {
    supabase
      .from('restaurants')
      .select('name, slug')
      .is('deleted_at', null)
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setRestaurants(data);
      });
  }, []);
  
  // Strip trailing slash for robust routing
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  // Parse dynamic restaurant slug from path prefix (e.g. /r/kfc/login -> slug: kfc, subpath: /login)
  const prefixMatch = path.match(/^\/r\/([^/]+)(\/.*)?$/);
  const restaurantSlug = prefixMatch ? prefixMatch[1] : null;
  const subpath = prefixMatch ? (prefixMatch[2] || '/') : path;

  // 1. Initial restoring session state loader
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex flex-col items-center justify-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200/60"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-[#E63946] animate-spin"></div>
        </div>
        <div className="text-slate-500 text-sm font-medium animate-pulse">
          Restoring session...
        </div>
      </div>
    );
  }

  // 1a. Subscription expired gate
  if (isExpired) {
    return <AccountExpiredView />;
  }

  // 1b. Authenticated redirection handler
  if (user) {
    let redirectTarget = null;
    const isRootOrLogin = ['/', '/login', '/super', '/owner', `/r/${restaurantSlug}`, `/r/${restaurantSlug}/login`].includes(path);
    
    if (isRootOrLogin) {
      if (user.role === 'admin' && user.restaurantSlug) {
        redirectTarget = `/r/${user.restaurantSlug}/admin`;
      } else if (user.role === 'kitchen_staff' && user.restaurantSlug) {
        redirectTarget = `/r/${user.restaurantSlug}/kitchen`;
      } else if (user.role === 'sales_staff' && user.restaurantSlug) {
        redirectTarget = `/r/${user.restaurantSlug}/waiter`;
      } else if (user.role === 'waiter' && user.restaurantSlug) {
        redirectTarget = `/r/${user.restaurantSlug}/waiter-pos`;
      } else if (user.role === 'super_admin') {
        redirectTarget = '/super';
      }
    }

    if (redirectTarget && redirectTarget !== path) {
      window.history.replaceState(null, '', redirectTarget);
      window.location.reload();
      return null;
    }
  }

  // Save current restaurant slug to localStorage for continuity if we are on a prefixed route
  if (restaurantSlug) {
    localStorage.setItem('ordering_restaurant', restaurantSlug);
  } else {
    // If NO restaurantSlug is in the URL, and it is NOT an owner/super path:
    const isOwnerPath = ['/owner', '/super'].includes(path);
    if (!isOwnerPath) {
      return <LandingView />;
    }
  }

  // 2. Public Customer Ordering view (no login needed)
  if (subpath === '/customer') {
    return <CustomerView />;
  }

  // 3. Public Login page
  if (subpath === '/login') {
    return <LoginView />;
  }

  // 3a. Password reset pages (public)
  if (subpath === '/forgot-password') {
    return <ForgotPasswordView />;
  }
  if (subpath === '/update-password') {
    return <UpdatePasswordView />;
  }

  // 3b. Platform Owner Login page
  if (subpath === '/owner') {
    if (user && user.role === 'super_admin') {
      window.history.replaceState(null, '', '/super');
      return <SuperAdminView />;
    }
    return <LoginView />;
  }

  // ─── Route Guards (All management paths require login) ───

  // If path is a protected dashboard and user is not authenticated, redirect
  const isProtectedPath = ['/admin', '/waiter', '/waiter-pos', '/kitchen', '/super'].includes(subpath);
  if (isProtectedPath && !user) {
    if (subpath === '/super') {
      window.history.replaceState(null, '', '/owner');
      return <LoginView />;
    } else if (subpath === '/admin') {
      window.history.replaceState(null, '', '/');
      return <LandingView />;
    } else {
      const targetLogin = restaurantSlug ? `/r/${restaurantSlug}/login` : '/login';
      window.history.replaceState(null, '', targetLogin);
      return <LoginView />;
    }
  }

  // If authenticated but visiting a route with a mismatching slug (e.g. kfc staff on /r/mcdonalds/waiter)
  if (user && restaurantSlug && user.restaurantSlug && user.restaurantSlug !== restaurantSlug) {
    // Redirect to their own restaurant slug route
    const correctPath = path.replace(`/r/${restaurantSlug}`, `/r/${user.restaurantSlug}`);
    window.history.replaceState(null, '', correctPath);
    window.location.reload();
    return null;
  }

  // If authenticated and has a restaurant slug, but is on a non-prefixed protected route, redirect to prefixed one
  if (user && user.restaurantSlug && !restaurantSlug && isProtectedPath && subpath !== '/super') {
    const prefixedPath = `/r/${user.restaurantSlug}${subpath}`;
    window.history.replaceState(null, '', prefixedPath);
    window.location.reload();
    return null;
  }

  // 4. Admin Panel
  if (subpath === '/admin') {
    if (user.role !== 'admin') {
      const targetLogin = restaurantSlug ? `/r/${restaurantSlug}/login` : '/login';
      window.history.replaceState(null, '', targetLogin);
      return <LoginView />;
    }
    return <AdminView />;
  }

  // 5. Kitchen Terminal
  if (subpath === '/kitchen') {
    if (user.role !== 'kitchen_staff' && user.role !== 'admin') {
      const targetLogin = restaurantSlug ? `/r/${restaurantSlug}/login` : '/login';
      window.history.replaceState(null, '', targetLogin);
      return <LoginView />;
    }
    return <KitchenView />;
  }

  // 6. Sales / POS Terminal
  if (subpath === '/waiter' || subpath === '/pos') {
    if (user.role !== 'sales_staff' && user.role !== 'admin') {
      const targetLogin = restaurantSlug ? `/r/${restaurantSlug}/login` : '/login';
      window.history.replaceState(null, '', targetLogin);
      return <LoginView />;
    }
    return <WaiterView />;
  }

  // 6b. Waiter Table Dashboard & Tablet POS Terminal (New)
  if (subpath === '/waiter-pos') {
    if (user.role !== 'waiter' && user.role !== 'admin' && user.role !== 'sales_staff') {
      const targetLogin = restaurantSlug ? `/r/${restaurantSlug}/login` : '/login';
      window.history.replaceState(null, '', targetLogin);
      return <LoginView />;
    }
    return <WaiterPosView />;
  }

  // 7. Super Admin Portal
  if (subpath === '/super') {
    if (user.role !== 'super_admin') {
      window.history.replaceState(null, '', '/owner');
      return <LoginView />;
    }
    return <SuperAdminView />;
  }

  // Fallback to central portal
  return <LandingView />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors closeButton />
      <AppContent />
    </AuthProvider>
  );
}
