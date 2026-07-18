import React from 'react';
import { Star } from 'lucide-react';

export default function Testimonials() {
  return (
    <section className="reveal-on-scroll bg-[#F8F8F8] border-t border-[#ECECEC] py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 max-w-xl mx-auto">
          <span className="text-[10px] font-extrabold text-[#666666] uppercase tracking-wider block">PARTNER REVIEWS</span>
          <h2 className="text-3xl lg:text-[48px] font-extrabold text-[#111111] tracking-tight leading-none mt-2">Loved by owners.</h2>
          <p className="text-sm text-[#666666] mt-4">See how restaurant operators transformed their order workflows using Apex Scan.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Testimonial 1 */}
          <div className="bg-white border border-[#ECECEC] p-8 rounded-3xl shadow-sm relative flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1 text-[#C6FF2E] mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current stroke-black" />)}
              </div>
              <blockquote className="text-[#111111] font-bold text-sm leading-relaxed mb-6">
                "Apex Scan helped us cut average customer check out times by half. Guests scan QR tables, complete payments on their phones, and kitchen queues receive the order tickets automatically. It's a game-changer."
              </blockquote>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-200 overflow-hidden flex items-center justify-center font-extrabold text-xs">
                AF
              </div>
              <div>
                <cite className="text-xs font-extrabold text-[#111111] not-italic block">Ali Fayyaz</cite>
                <span className="text-[10px] text-[#666666] block">Owner, Gourmet Bistro</span>
              </div>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div className="bg-white border border-[#ECECEC] p-8 rounded-3xl shadow-sm relative flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1 text-[#C6FF2E] mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current stroke-black" />)}
              </div>
              <blockquote className="text-[#111111] font-bold text-sm leading-relaxed mb-6">
                "Managing three branches used to require constant calls. Now I log into the Super Admin console, update our menu pricing instantly, and review total sales of each restaurant under one layout. Absolutely outstanding."
              </blockquote>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-200 overflow-hidden flex items-center justify-center font-extrabold text-xs">
                AR
              </div>
              <div>
                <cite className="text-xs font-extrabold text-[#111111] not-italic block">Asim R.</cite>
                <span className="text-[10px] text-[#666666] block">General Manager, Cheezious</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
