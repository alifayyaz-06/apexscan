import React from 'react';
import { ShieldX, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AccountExpiredView() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-10 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 mb-3">Subscription Expired</h1>
        <p className="text-zinc-600 text-sm leading-relaxed mb-8">
          Your restaurant subscription has expired. Access to the dashboard, menu management, orders, and all other features has been suspended.
        </p>
        <p className="text-zinc-500 text-xs mb-8">
          Please contact the platform administrator to renew your subscription and restore access.
        </p>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-lg font-medium text-sm hover:bg-zinc-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
