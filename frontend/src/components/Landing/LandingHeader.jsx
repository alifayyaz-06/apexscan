import React from 'react';
import { QrCode } from 'lucide-react';

export default function LandingHeader({ onLoginClick }) {
  return (
    <header className="border-b border-[#ECECEC] bg-white/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-[#111111] rounded-lg flex items-center justify-center text-white font-extrabold text-sm">
            <QrCode className="w-4 h-4 text-[#C6FF2E]" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-[#111111]">Apex Scan</span>
        </a>
        
        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#666666]">
          <a href="#" className="hover:text-[#111111] transition-colors">Home</a>
          <a href="#features" className="hover:text-[#111111] transition-colors">Features</a>
          <a href="#showcase" className="hover:text-[#111111] transition-colors">Showcase</a>
          <a href="#faq" className="hover:text-[#111111] transition-colors">FAQ</a>
          <a href="#contact" className="hover:text-[#111111] transition-colors">Contact</a>
        </nav>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onLoginClick}
            className="py-2.5 px-4 text-xs font-bold text-[#666666] hover:text-[#111111] transition-colors"
          >
            Login
          </button>
          <a 
            href="#free-trial"
            className="py-2.5 px-4 bg-[#C6FF2E] hover:bg-[#b5ee22] text-[#111111] font-extrabold text-xs rounded-xl shadow-sm border border-black/5 transition-all"
          >
            Get Started
          </a>
        </div>
      </div>
    </header>
  );
}
