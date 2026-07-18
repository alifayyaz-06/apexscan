import React from 'react';
import { Play } from 'lucide-react';

export default function DemoVideo() {
  return (
    <section id="demo-video" className="reveal-on-scroll max-w-7xl mx-auto px-6 py-20 lg:py-32">
      <div className="text-center mb-12 max-w-xl mx-auto">
        <span className="text-[10px] font-bold text-[#111111] uppercase tracking-widest bg-[#C6FF2E] border border-black/5 px-3 py-1 rounded-full">
          SYSTEM WALKTHROUGH
        </span>
        <h2 className="text-3xl lg:text-[48px] font-extrabold text-[#111111] tracking-tight leading-none mt-4">
          See the Platform in Action
        </h2>
        <p className="text-sm text-[#666666] mt-4 leading-relaxed">
          Watch how our multi-tenant SaaS connects branches, prints order receipts, and updates stock inventory live on every table transaction.
        </p>
      </div>
      
      {/* Video Player Mockup with floating badges */}
      <div className="relative mx-auto max-w-4xl bg-white border border-[#ECECEC] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.06)] overflow-hidden group">
        {/* Window control bar */}
        <div className="bg-[#F8F8F8] border-b border-[#ECECEC] px-5 py-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-200"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-200"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-200"></span>
          <span className="text-[10px] font-semibold text-[#666666] ml-3 font-mono">smart_ordering_system_v2.mp4</span>
        </div>
        
        {/* Video Container */}
        <div className="relative aspect-video bg-[#111111] flex items-center justify-center">
          {/* Play overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-950 p-6 text-center">
            {/* Lime green background blur circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#C6FF2E]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#C6FF2E]/20 transition-all duration-300"></div>
            
            <div className="w-16 h-16 rounded-full bg-[#C6FF2E] hover:bg-[#b9f220] text-[#111111] shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 cursor-pointer z-10">
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            </div>
            <h4 className="text-white font-extrabold text-base mt-5 z-10 tracking-tight">Interactive Walkthrough</h4>
            <p className="text-[#666666] text-xs max-w-xs mt-1 z-10 leading-relaxed">
              Connect your demo walkthrough to show branches, online orders, and POS terminals.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
