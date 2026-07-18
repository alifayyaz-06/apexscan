import React from 'react';
import { X, Mail, KeyRound } from 'lucide-react';

export default function ResetPasswordModal({
  show,
  onClose,
  resetStep,
  resetEmail,
  setResetEmail,
  resetOtp,
  setResetOtp,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  resetError,
  resetSuccess,
  resetLoading,
  onSendCode,
  onResetPassword,
  onChangeEmail,
  onResendCode
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

        {resetStep === 'email' && (
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F8] border border-[#ECECEC] flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-[#111111]" />
            </div>
            <h3 className="text-base font-extrabold text-[#111111] mb-1">Reset Password</h3>
            <p className="text-xs text-[#666666] mb-4 leading-relaxed">
              Enter your registered admin email address to receive a verification code.
            </p>

            {resetError && (
              <div className="bg-red-50 border border-red-150 text-red-600 text-xs font-semibold px-4.5 py-2 rounded-xl mb-4 text-center">
                {resetError}
              </div>
            )}
            {resetSuccess && (
              <div className="bg-emerald-50 border border-emerald-150 text-emerald-600 text-xs font-semibold px-4.5 py-2 rounded-xl mb-4 text-center">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={onSendCode} className="flex flex-col gap-3">
              <div>
                <label className="text-[9px] font-extrabold text-[#666666] uppercase tracking-wider mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="owner@gourmetbistro.com"
                  className="w-full py-2.5 px-4 bg-white border border-[#ECECEC] rounded-xl text-xs text-[#111111] focus:border-[#111111] outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3 bg-[#111111] hover:bg-zinc-900 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center mt-1"
              >
                {resetLoading ? 'Sending Code...' : 'Send Reset Code'}
              </button>
            </form>
          </div>
        )}

        {resetStep === 'otp' && (
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F8] border border-[#ECECEC] flex items-center justify-center mb-4">
              <KeyRound className="w-5 h-5 text-[#111111]" />
            </div>
            <h3 className="text-base font-extrabold text-[#111111] mb-1">Enter Code & New Password</h3>
            <p className="text-xs text-[#666666] mb-4 leading-relaxed">
              We sent a 6-digit code to <span className="font-bold text-[#111111]">{resetEmail}</span>.
            </p>

            {resetError && (
              <div className="bg-red-50 border border-red-150 text-red-600 text-xs font-semibold px-4.5 py-2 rounded-xl mb-4 text-center">
                {resetError}
              </div>
            )}
            {resetSuccess && (
              <div className="bg-emerald-50 border border-emerald-150 text-emerald-600 text-xs font-semibold px-4.5 py-2 rounded-xl mb-4 text-center">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={onResetPassword} className="flex flex-col gap-3">
              <div>
                <label className="text-[9px] font-extrabold text-[#666666] uppercase tracking-wider mb-1.5 block">Verification Code</label>
                <input
                  type="text"
                  required
                  value={resetOtp}
                  onChange={e => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full py-2.5 px-4 bg-white border border-[#ECECEC] rounded-xl text-xs text-[#111111] text-center tracking-[0.3em] font-mono focus:border-[#111111] outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-[#666666] uppercase tracking-wider mb-1.5 block">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full py-2.5 px-4 bg-white border border-[#ECECEC] rounded-xl text-xs text-[#111111] focus:border-[#111111] outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-[#666666] uppercase tracking-wider mb-1.5 block">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full py-2.5 px-4 bg-white border border-[#ECECEC] rounded-xl text-xs text-[#111111] focus:border-[#111111] outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={resetLoading || resetOtp.length !== 6}
                className="w-full py-3 bg-[#111111] hover:bg-[#C6FF2E] hover:text-[#111111] text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center mt-1 disabled:opacity-50"
              >
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </button>
              <div className="flex justify-between text-[10px] font-bold mt-2">
                <button type="button" onClick={onChangeEmail} className="text-zinc-400 hover:text-[#111111]">
                  Change email
                </button>
                <button type="button" onClick={onResendCode} className="text-[#111111] hover:underline">
                  Resend code
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
