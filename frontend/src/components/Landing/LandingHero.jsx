import React from 'react';
import { ArrowRight, Sparkles, ShoppingBag, QrCode } from 'lucide-react';

export default function LandingHero() {
  return (
    <section className="reveal-on-scroll max-w-7xl mx-auto px-6 py-16 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
      {/* Left Side Content */}
      <div className="lg:col-span-6 flex flex-col items-start text-left z-10">
        <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-extrabold tracking-tight text-[#111111] leading-[1.05] mb-6">
          Apex Scan Ordering <br />
          For Modern SaaS Restaurants.
        </h1>
        <p className="text-base sm:text-lg text-[#666666] leading-relaxed max-w-lg mb-8">
          Create digital menus, accept instant table payments, coordinate staff stations, and view branch analytics from a single premium dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <a 
            href="#free-trial"
            className="py-3.5 px-6 bg-[#111111] hover:bg-zinc-900 text-white font-extrabold text-xs rounded-xl text-center shadow-sm flex items-center justify-center gap-2 group transition-all"
          >
            Start Free Trial 
            <ArrowRight className="w-4 h-4 text-[#C6FF2E] group-hover:translate-x-1 transition-transform" />
          </a>
          <a 
            href="#showcase"
            className="py-3.5 px-6 bg-[#F8F8F8] border border-[#ECECEC] hover:bg-[#111111] hover:text-white text-[#111111] font-extrabold text-xs rounded-xl text-center transition-all"
          >
            Explore Dashboard
          </a>
        </div>
      </div>

      {/* Right Side Visual Layout (Dashboard Mockup & Floatings) */}
      <div className="lg:col-span-6 relative flex items-center justify-center">
        {/* Main Mockup Screen */}
        <div className="w-full max-w-[500px] bg-white border border-[#ECECEC] rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.06)] relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#ECECEC] pb-3 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-200"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-200"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-200"></span>
            </div>
            <span className="text-[10px] font-mono text-[#666666]">console.apexscan.com</span>
            <div className="w-6 h-6 rounded-md bg-[#C6FF2E] flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-[#111111]" />
            </div>
          </div>
          
          {/* Mock Dashboard Layout */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#F8F8F8] border border-[#ECECEC] p-3 rounded-2xl">
                <span className="text-[9px] text-[#666666] uppercase block">Today Sales</span>
                <span className="text-sm font-extrabold text-[#111111]">Rs 2,450</span>
              </div>
              <div className="bg-[#F8F8F8] border border-[#ECECEC] p-3 rounded-2xl">
                <span className="text-[9px] text-[#666666] uppercase block">Active Tables</span>
                <span className="text-sm font-extrabold text-[#111111]">14 / 20</span>
              </div>
              <div className="bg-[#F8F8F8] border border-[#ECECEC] p-3 rounded-2xl">
                <span className="text-[9px] text-[#666666] uppercase block">Kitchen Queue</span>
                <span className="text-sm font-extrabold text-amber-500">6 Cooking</span>
              </div>
            </div>
            
            {/* Mock Chart Area */}
            <div className="bg-[#F8F8F8] border border-[#ECECEC] rounded-2xl p-4 h-36 flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#111111]">Monthly Growth</span>
                <span className="text-[#E63946] font-bold font-mono">+12.4%</span>
              </div>
              {/* SVG Mock line chart */}
              <svg className="w-full h-20" viewBox="0 0 100 30" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C6FF2E" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#C6FF2E" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,25 C10,20 20,28 30,15 C40,5 50,18 60,10 C70,2 80,14 90,8 C95,5 100,2 100,2 L100,30 L0,30 Z" fill="url(#glow)" />
                <path d="M0,25 C10,20 20,28 30,15 C40,5 50,18 60,10 C70,2 80,14 90,8 C95,5 100,2 100,2" fill="none" stroke="#111111" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        </div>

        {/* Floating Card 1: Order Alert */}
        <div className="absolute -top-6 -right-6 bg-white border border-[#ECECEC] p-3 rounded-2xl shadow-xl flex items-center gap-3 animate-float max-w-xs z-20" style={{ animationDelay: '1s' }}>
          <div className="w-8 h-8 rounded-lg bg-[#C6FF2E]/30 flex items-center justify-center text-[#111111]">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-zinc-400 block uppercase">NEW ORDER</span>
            <span className="text-xs font-bold text-[#111111]">Table 04 requested checkout</span>
          </div>
        </div>

        {/* Floating Card 2: QR Code Scan */}
        <div className="absolute bottom-6 -left-8 bg-white border border-[#ECECEC] p-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-float max-w-xs z-20">
          <div className="w-8 h-8 rounded-lg bg-[#111111] flex items-center justify-center text-white">
            <QrCode className="w-4 h-4 text-[#C6FF2E]" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-zinc-400 block uppercase">QR ACTIVATION</span>
            <span className="text-xs font-bold text-[#111111]">Custom QR Stand Generated</span>
          </div>
        </div>
      </div>
    </section>
  );
}
