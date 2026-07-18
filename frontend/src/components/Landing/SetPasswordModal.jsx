import React from 'react';
import { X, Mail, KeyRound, Lock } from 'lucide-react';

export default function SetPasswordModal({
  show,
  onClose,
  step,
  email,
  setEmail,
  otp,
  setOtp,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  success,
  loading,
  onSendCode,
  onVerifyAndSet,
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

        {/* Step 1: Enter Email */}
        {step === 'email' && (
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#C6FF2E]/20 border border-[#C6FF2E]/30 flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-[#111111]" />
            </div>
            <h3 className="text-base font-extrabold text-[#111111] mb-1">Set Your Password</h3>
            <p className="text-xs text-[#666666] mb-4 leading-relaxed">
              Enter your admin email address. A 6-digit verification code will be sent to confirm your identity.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-150 text-red-600 text-xs font-semibold px-4 py-2 rounded-xl mb-4 text-center">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 border border-emerald-150 text-emerald-600 text-xs font-semibold px-4 py-2 rounded-xl mb-4 text-center">
                {success}
              </div>
            )}

            <form onSubmit={onSendCode} className="flex flex-col gap-3">
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
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#111111] hover:bg-zinc-900 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center mt-1"
              >
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Enter OTP + Set Password */}
        {step === 'otp' && (
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#C6FF2E]/20 border border-[#C6FF2E]/30 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-[#111111]" />
            </div>
            <h3 className="text-base font-extrabold text-[#111111] mb-1">Verify & Set Password</h3>
            <p className="text-xs text-[#666666] mb-4 leading-relaxed">
              Enter the 6-digit code sent to <span className="font-bold text-[#111111]">{email}</span> and create your password.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-150 text-red-600 text-xs font-semibold px-4 py-2 rounded-xl mb-4 text-center">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 border border-emerald-150 text-emerald-600 text-xs font-semibold px-4 py-2 rounded-xl mb-4 text-center">
                {success}
              </div>
            )}

            <form onSubmit={onVerifyAndSet} className="flex flex-col gap-3">
              <div>
                <label className="text-[9px] font-extrabold text-[#666666] uppercase tracking-wider mb-1.5 block">Verification Code</label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full py-2.5 px-4 bg-white border border-[#ECECEC] rounded-xl text-xs text-[#111111] focus:border-[#111111] outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-[#C6FF2E] hover:bg-[#b5ee22] text-[#111111] font-extrabold text-xs rounded-xl transition-all shadow-sm border border-black/5 flex items-center justify-center mt-1 disabled:opacity-50"
              >
                {loading ? 'Setting Password...' : 'Set Password & Activate'}
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
