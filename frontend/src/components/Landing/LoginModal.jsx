import React from 'react';
import { X } from 'lucide-react';

export default function LoginModal({
  show,
  onClose,
  email,
  setEmail,
  password,
  setPassword,
  error,
  loading,
  onSubmit,
  onForgotPasswordClick,
  onSetPasswordClick
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-[#ECECEC] max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-left">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-950 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-extrabold text-[#111111] tracking-tight">Access Your Restaurant</h2>
          <p className="text-[#666666] text-xs mt-1 leading-normal">Enter your credentials to access the console</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-150 text-red-600 text-xs font-semibold px-4 py-2.5 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[9px] font-extrabold text-[#666666] uppercase tracking-wider mb-1.5 block">Admin Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="owner@gourmetbistro.com"
              className="w-full py-2.5 px-4 bg-white border border-[#ECECEC] rounded-xl text-xs text-[#111111] focus:border-[#111111] outline-none transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[9px] font-extrabold text-[#666666] uppercase tracking-wider block">Password</label>
              <button
                type="button"
                onClick={onForgotPasswordClick}
                className="text-[9px] font-extrabold text-[#666666] hover:underline transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full py-2.5 px-4 bg-white border border-[#ECECEC] rounded-xl text-xs text-[#111111] focus:border-[#111111] outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#111111] hover:bg-zinc-900 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>

          {/* Set Password Link */}
          <div className="text-center mt-4 pt-4 border-t border-[#F0F0F0]">
            <p className="text-[10px] text-[#999999] mb-1">First time logging in?</p>
            <button
              type="button"
              onClick={onSetPasswordClick}
              className="text-[11px] font-extrabold text-[#111111] hover:text-[#C6FF2E] transition-colors underline underline-offset-2"
            >
              Haven't set your password yet? Click to set
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
