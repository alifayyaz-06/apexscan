import React, { useState } from 'react';
import { API_URL } from '../utils/config';

export default function ForgotPasswordView() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialEmail = searchParams.get('email') || '';
  const initialStep = parseInt(searchParams.get('step') || '1', 10);

  const [step, setStep] = useState(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const pathMatch = window.location.pathname.match(/^\/r\/([^/]+)/);
  const currentSlug = pathMatch ? pathMatch[1] : null;
  const loginPath = currentSlug ? `/r/${currentSlug}/login` : '/login';

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/admin/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Something went wrong.');
      } else {
        setStep(2);
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/admin/reset-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Failed to reset password.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.035)] p-6 text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#2B2D42] mb-2">Password Reset Successful</h3>
            <p className="text-slate-500 text-sm mb-6">You can now log in with your new password.</p>
            <a href={loginPath} className="inline-block px-6 py-2.5 bg-[#E63946] text-white font-semibold rounded-lg hover:bg-[#d32f3c] transition-colors">
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-[#2B2D42] mb-2">Reset Password</h1>
          <p className="text-slate-400 text-sm">
            {step === 1 && 'Enter your email to receive a verification code'}
            {step === 2 && 'Enter the 6-digit code sent to your email and set a new password'}
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.035)] p-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946]/20 focus:border-[#E63946] transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#E63946] text-white font-semibold rounded-lg hover:bg-[#d32f3c] transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
              <div className="text-center">
                <a href={loginPath} className="text-slate-400 text-sm hover:text-slate-600">Back to login</a>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Verification Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center tracking-[0.3em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[#E63946]/20 focus:border-[#E63946] transition-all"
                />
                <p className="text-xs text-slate-400 mt-1">Check your inbox for the 6-digit code</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946]/20 focus:border-[#E63946] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Repeat password"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946]/20 focus:border-[#E63946] transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-2.5 bg-[#E63946] text-white font-semibold rounded-lg hover:bg-[#d32f3c] transition-colors disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <div className="flex justify-between">
                <button type="button" onClick={() => { setStep(1); setError(''); }} className="text-slate-400 text-sm hover:text-slate-600">
                  Change email
                </button>
                <button type="button" onClick={handleSendCode} className="text-[#E63946] text-sm hover:underline">
                  Resend code
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
