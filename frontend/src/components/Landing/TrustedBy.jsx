import React from 'react';

export default function TrustedBy() {
  return (
    <section className="reveal-on-scroll border-y border-[#ECECEC] bg-[#F8F8F8] py-8 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-8">
        <span className="text-[10px] font-extrabold text-[#666666] tracking-wider uppercase whitespace-nowrap">TRUSTED BY WORLD-CLASS BRANDS</span>
        
        <div className="flex-1 overflow-hidden relative w-full flex items-center">
          {/* Scrolling Marquee */}
          <div className="flex gap-16 items-center min-w-full animate-marquee">
            <span className="font-extrabold text-sm tracking-tight text-[#111111] uppercase font-mono">GOURMET BISTRO</span>
            <span className="font-extrabold text-sm tracking-tight text-[#111111] uppercase font-mono">CHEEZIOUS</span>
            <span className="font-extrabold text-sm tracking-tight text-[#111111] uppercase font-mono">BISTRONE</span>
            <span className="font-extrabold text-sm tracking-tight text-[#111111] uppercase font-mono">CRISP COFFEE</span>
            <span className="font-extrabold text-sm tracking-tight text-[#111111] uppercase font-mono">ROSEWOOD EATS</span>
            {/* Duplicate for infinite loop */}
            <span className="font-extrabold text-sm tracking-tight text-[#111111] uppercase font-mono">GOURMET BISTRO</span>
            <span className="font-extrabold text-sm tracking-tight text-[#111111] uppercase font-mono">CHEEZIOUS</span>
            <span className="font-extrabold text-sm tracking-tight text-[#111111] uppercase font-mono">BISTRONE</span>
            <span className="font-extrabold text-sm tracking-tight text-[#111111] uppercase font-mono">CRISP COFFEE</span>
            <span className="font-extrabold text-sm tracking-tight text-[#111111] uppercase font-mono">ROSEWOOD EATS</span>
          </div>
        </div>
      </div>
    </section>
  );
}
