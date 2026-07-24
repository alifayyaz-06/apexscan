import React from 'react';
import { MapPin, Mail, Phone } from 'lucide-react';

export default function TrialAndContact({
  SUPPORT_EMAIL,
  WHATSAPP_NUMBER,
  trialName,
  setTrialName,
  trialRestName,
  setTrialRestName,
  trialPhone,
  setTrialPhone,
  trialEmail,
  setTrialEmail,
  trialLoading,
  onSubmitTrial
}) {
  return (
    <section id="free-trial" className="reveal-on-scroll max-w-7xl mx-auto px-6 py-20 lg:py-32">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start max-w-5xl mx-auto">
        {/* Left Side: Office & Direct Contact Info */}
        <div className="lg:col-span-5 text-left">
          <span className="text-[10px] font-mono font-bold text-[#666666] uppercase tracking-widest block mb-2">OFFICE & SUPPORT</span>
          <h2 className="text-3xl font-black text-[#111111] tracking-tight leading-none mb-4">Start your trial.</h2>
          <p className="text-sm text-[#666666] leading-relaxed mb-8">
            Submit your restaurant details to launch your 14-day free demo. For custom franchise integrations, direct mail or message our dev support team on WhatsApp.
          </p>
          
          <div className="flex flex-col gap-6 text-xs text-[#666666]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F8F8F8] border border-[#ECECEC] flex items-center justify-center text-[#111111]">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-[9px] text-zinc-400 block uppercase">HEADQUARTERS</span>
                <span className="font-bold text-[#111111]">Lahore, Punjab, Pakistan</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F8F8F8] border border-[#ECECEC] flex items-center justify-center text-[#111111]">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-[9px] text-zinc-400 block uppercase">EMAIL DISPATCH</span>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-[#111111] hover:text-[#C6FF2E] transition-colors">{SUPPORT_EMAIL}</a>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F8F8F8] border border-[#ECECEC] flex items-center justify-center text-[#111111]">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-[9px] text-zinc-400 block uppercase">DIRECT CHAT SUPPORT</span>
                <a href={`tel:+${WHATSAPP_NUMBER}`} className="font-bold text-[#111111]">+{WHATSAPP_NUMBER.slice(0,2)} {WHATSAPP_NUMBER.slice(2, 5)} {WHATSAPP_NUMBER.slice(5)}</a>
              </div>
            </div>
          </div>

          {/* Glowing Map Mockup */}
          <div className="mt-10 border border-[#ECECEC] rounded-3xl p-4 bg-[#F8F8F8] h-48 relative overflow-hidden flex items-center justify-center">
            {/* Minimalist World Map Outline */}
            <svg className="w-full h-full opacity-35" viewBox="0 0 100 50">
              <path d="M15,10 Q25,5 35,15 T55,10 T75,20 T95,12" fill="none" stroke="#666666" strokeWidth="0.5" strokeDasharray="2 2" />
              <path d="M10,25 Q30,28 50,20 T80,32 T90,22" fill="none" stroke="#666666" strokeWidth="0.5" strokeDasharray="2 2" />
            </svg>
            {/* Animated glowing location marker */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <span className="absolute w-6 h-6 rounded-full bg-[#C6FF2E]/40 animate-pulse-ring"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#111111] border border-[#C6FF2E] z-10"></span>
            </div>
            <span className="absolute bottom-3 left-4 text-[9px] font-bold text-[#666666] tracking-wider uppercase">LAHORE LABS ACTIVE</span>
          </div>
        </div>

        {/* Right Side: Free Trial Disabled info */}
        <div id="contact" className="lg:col-span-7 bg-[#F8F8F8] border border-[#ECECEC] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-center text-left">
          <h3 className="font-extrabold text-lg text-[#111111] mb-4">Wanna Experience Free Trial?</h3>
          <p className="text-sm text-[#666666] leading-relaxed mb-6">
            14-Day self-service free trials are temporarily closed. To register your restaurant or request a custom onboarding/demo, please get in touch with our operations team directly:
          </p>
          <div className="flex flex-col gap-4 mt-2">
            <a 
              href={`https://wa.me/${WHATSAPP_NUMBER}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="py-3 px-6 bg-[#C6FF2E] hover:bg-[#b5ee22] text-[#111111] font-extrabold text-xs rounded-xl shadow-sm border border-black/5 text-center transition-all cursor-pointer block"
            >
              Contact Support on WhatsApp
            </a>
            <a 
              href={`mailto:${SUPPORT_EMAIL}`}
              className="py-3 px-6 bg-white hover:bg-zinc-50 text-[#111111] font-extrabold text-xs rounded-xl shadow-sm border border-[#ECECEC] text-center transition-all cursor-pointer block"
            >
              Email Operations Support
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
