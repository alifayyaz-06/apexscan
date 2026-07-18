import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { API_URL } from '../utils/config';

import LandingHeader from '../components/Landing/LandingHeader';
import LandingHero from '../components/Landing/LandingHero';
import TrustedBy from '../components/Landing/TrustedBy';
import DemoVideo from '../components/Landing/DemoVideo';
import FeatureGrid from '../components/Landing/FeatureGrid';
import ShowcaseSection from '../components/Landing/ShowcaseSection';
import LaunchProcess from '../components/Landing/LaunchProcess';
import AnalyticsSection from '../components/Landing/AnalyticsSection';
import Testimonials from '../components/Landing/Testimonials';
import FaqSection from '../components/Landing/FaqSection';
import TrialAndContact from '../components/Landing/TrialAndContact';
import LandingFooter from '../components/Landing/LandingFooter';
import LoginModal from '../components/Landing/LoginModal';
import ResetPasswordModal from '../components/Landing/ResetPasswordModal';
import SetPasswordModal from '../components/Landing/SetPasswordModal';

// Customization constants
const WHATSAPP_NUMBER = "92312064468"; 
const SUPPORT_EMAIL = "alifayyaz958362@gmail.com";

export default function LandingView() {
  const { adminLogin } = useAuth();
  
  // Modal controllers
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);

  // Login credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password modal flow
  const [resetStep, setResetStep] = useState('email'); // 'email' | 'otp'
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Set Password modal flow (first-time setup)
  const [setPassStep, setSetPassStep] = useState('email'); // 'email' | 'otp'
  const [setPassEmail, setSetPassEmail] = useState('');
  const [setPassOtp, setSetPassOtp] = useState('');
  const [setPassNew, setSetPassNew] = useState('');
  const [setPassConfirm, setSetPassConfirm] = useState('');
  const [setPassError, setSetPassError] = useState('');
  const [setPassSuccess, setSetPassSuccess] = useState('');
  const [setPassLoading, setSetPassLoading] = useState(false);

  // Trial request state
  const [trialName, setTrialName] = useState('');
  const [trialEmail, setTrialEmail] = useState('');
  const [trialPhone, setTrialPhone] = useState('');
  const [trialRestName, setTrialRestName] = useState('');
  const [trialLoading, setTrialLoading] = useState(false);

  // Scroll reveal animation observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -50px 0px' }
    );
    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));
    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  useEffect(() => {
    // Clean up recovery URL parameters
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes('access_token=') || search.includes('token_hash=') || search.includes('code=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetStep('email');
    setResetEmail('');
    setResetOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setResetError('');
    setResetSuccess('');
    setResetLoading(false);
  };

  const closeSetPasswordModal = () => {
    setShowSetPasswordModal(false);
    setSetPassStep('email');
    setSetPassEmail('');
    setSetPassOtp('');
    setSetPassNew('');
    setSetPassConfirm('');
    setSetPassError('');
    setSetPassSuccess('');
    setSetPassLoading(false);
  };

  // Set Password: Step 1 — Send verification code (reuses forgot-password endpoint)
  const handleSetPasswordSendCode = async (e) => {
    if (e) e.preventDefault();
    setSetPassError('');
    setSetPassSuccess('');
    setSetPassLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/admin/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: setPassEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send verification code.');

      setSetPassStep('otp');
      setSetPassSuccess('Verification code sent to your email.');
    } catch (err) {
      setSetPassError(err.message);
    } finally {
      setSetPassLoading(false);
    }
  };

  // Set Password: Step 2 — Verify OTP and set password (reuses reset-password-otp endpoint)
  const handleSetPasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    setSetPassError('');
    setSetPassSuccess('');

    if (setPassNew !== setPassConfirm) {
      setSetPassError('Passwords do not match.');
      return;
    }
    if (setPassNew.length < 8) {
      setSetPassError('Password must be at least 8 characters.');
      return;
    }

    setSetPassLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/admin/reset-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: setPassEmail,
          otp: setPassOtp,
          password: setPassNew
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to set password.');

      setSetPassSuccess('Password set successfully! You can now log in.');
      setTimeout(() => {
        closeSetPasswordModal();
        setShowLoginModal(true);
      }, 2000);
    } catch (err) {
      setSetPassError(err.message);
    } finally {
      setSetPassLoading(false);
    }
  };

  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/admin/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send verification code.');

      setResetStep('otp');
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/admin/reset-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          otp: resetOtp,
          password: newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update password.');

      setResetSuccess('Password updated successfully! You can now log in.');
      setTimeout(() => {
        closeResetModal();
        setShowLoginModal(true);
      }, 2000);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await adminLogin(email, password);
      if (userData?.restaurantSlug) {
        window.location.href = `/r/${userData.restaurantSlug}/admin`;
      } else {
        window.location.href = '/admin';
      }
    } catch (err) {
      // If backend returns FIRST_TIME_SETUP, auto-open the Set Password modal
      if (err.code === 'FIRST_TIME_SETUP') {
        setShowLoginModal(false);
        setSetPassEmail(email);
        setSetPassStep('otp');
        setSetPassSuccess('A verification code has been sent to your email. Enter it below to set your password.');
        setShowSetPasswordModal(true);
      } else {
        setError(err.message || 'Login failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTrialSubmit = (e) => {
    if (e) e.preventDefault();
    setTrialLoading(true);
    
    const message = `Hi! I want to request a free trial for my restaurant.
My Details:
- Name: ${trialName}
- Restaurant: ${trialRestName}
- Phone/WhatsApp: ${trialPhone}
- Email: ${trialEmail}`;
    
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    
    setTimeout(() => {
      setTrialLoading(false);
      toast.success("Trial request generated! Redirecting to WhatsApp...");
      window.open(waUrl, '_blank');
      
      setTrialName('');
      setTrialEmail('');
      setTrialPhone('');
      setTrialRestName('');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans selection:bg-[#C6FF2E] selection:text-[#111111] overflow-x-hidden">
      {/* CSS Animation Overlays */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
        }
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .reveal-on-scroll.revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <LandingHeader onLoginClick={() => setShowLoginModal(true)} />
      
      <LandingHero />
      
      <TrustedBy />
      
      <DemoVideo />
      
      <FeatureGrid />
      
      <ShowcaseSection />
      
      <LaunchProcess />
      
      <AnalyticsSection />
      
      <Testimonials />
      
      <FaqSection />
      
      <TrialAndContact
        SUPPORT_EMAIL={SUPPORT_EMAIL}
        WHATSAPP_NUMBER={WHATSAPP_NUMBER}
        trialName={trialName}
        setTrialName={setTrialName}
        trialRestName={trialRestName}
        setTrialRestName={setTrialRestName}
        trialPhone={trialPhone}
        setTrialPhone={setTrialPhone}
        trialEmail={trialEmail}
        setTrialEmail={setTrialEmail}
        trialLoading={trialLoading}
        onSubmitTrial={handleTrialSubmit}
      />
      
      <LandingFooter WHATSAPP_NUMBER={WHATSAPP_NUMBER} SUPPORT_EMAIL={SUPPORT_EMAIL} />

      <LoginModal
        show={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        error={error}
        loading={loading}
        onSubmit={handleLoginSubmit}
        onForgotPasswordClick={() => {
          setShowLoginModal(false);
          setShowResetModal(true);
        }}
        onSetPasswordClick={() => {
          setShowLoginModal(false);
          setShowSetPasswordModal(true);
        }}
      />

      <ResetPasswordModal
        show={showResetModal}
        onClose={closeResetModal}
        resetStep={resetStep}
        resetEmail={resetEmail}
        setResetEmail={setResetEmail}
        resetOtp={resetOtp}
        setResetOtp={setResetOtp}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmNewPassword={confirmNewPassword}
        setConfirmNewPassword={setConfirmNewPassword}
        resetError={resetError}
        resetSuccess={resetSuccess}
        resetLoading={resetLoading}
        onSendCode={handleSendCode}
        onResetPassword={handleResetPassword}
        onChangeEmail={() => { setResetStep('email'); setResetError(''); }}
        onResendCode={handleSendCode}
      />

      <SetPasswordModal
        show={showSetPasswordModal}
        onClose={closeSetPasswordModal}
        step={setPassStep}
        email={setPassEmail}
        setEmail={setSetPassEmail}
        otp={setPassOtp}
        setOtp={setSetPassOtp}
        newPassword={setPassNew}
        setNewPassword={setSetPassNew}
        confirmPassword={setPassConfirm}
        setConfirmPassword={setSetPassConfirm}
        error={setPassError}
        success={setPassSuccess}
        loading={setPassLoading}
        onSendCode={handleSetPasswordSendCode}
        onVerifyAndSet={handleSetPasswordSubmit}
        onChangeEmail={() => { setSetPassStep('email'); setSetPassError(''); setSetPassSuccess(''); }}
        onResendCode={handleSetPasswordSendCode}
      />

      {/* Floating WhatsApp Widget */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] hover:bg-[#20ba59] text-white p-3.5 rounded-full shadow-[0_10px_30px_rgba(37,211,102,0.3)] hover:shadow-[0_15px_35px_rgba(37,211,102,0.4)] hover:-translate-y-1 transition-all duration-300 z-50 flex items-center justify-center border border-white/10"
        title="Chat on WhatsApp"
      >
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path>
        </svg>
      </a>
    </div>
  );
}
