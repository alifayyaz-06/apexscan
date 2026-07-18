import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function UpdatePasswordView() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setError('Invalid or expired reset link. Please request a new one.');
          } else {
            setSessionReady(true);
          }
        });
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setSessionReady(true);
        } else {
          setError('No valid session found. Please use the link from your email.');
        }
      });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-[#2B2D42] mb-2">Set New Password</h1>
          <p className="text-slate-400 text-sm">Choose a strong password for your account</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.035)] p-6">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#2B2D42] mb-2">Password Updated</h3>
              <p className="text-slate-500 text-sm mb-6">
                Your password has been changed successfully. You can now log in.
              </p>
              <a href="/login" className="text-[#E63946] font-medium text-sm hover:underline">
                Go to login
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-lg">
                  {error}
                </div>
              )}
              {!sessionReady && !error && (
                <div className="text-center text-slate-400 text-sm py-4">Verifying reset link...</div>
              )}
              {sessionReady && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Minimum 8 characters"
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
                      placeholder="Re-enter your password"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946]/20 focus:border-[#E63946] transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#E63946] text-white font-semibold rounded-lg hover:bg-[#d32f3c] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
