import React from 'react';
import { CheckCircle2, QrCode } from 'lucide-react';

export default function ShowcaseSection() {
  return (
    <section id="showcase" className="reveal-on-scroll max-w-7xl mx-auto px-6 py-20 lg:py-32 space-y-24">
      {/* Showcase Item 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5 text-left">
          <span className="text-[10px] font-extrabold text-[#666666] uppercase tracking-wider block mb-2">LIVE BRANCH CONSOLE</span>
          <h2 className="text-3xl lg:text-[40px] font-black tracking-tight text-[#111111] leading-none mb-4">
            Control your entire brand.
          </h2>
          <p className="text-sm text-[#666666] leading-relaxed mb-6">
            Track multi-tenant restaurant setups, assign managers to specific branches, and watch live sales statistics compile instantly as checks settle.
          </p>
          <ul className="space-y-3 text-xs font-semibold text-[#111111]">
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#C6FF2E] fill-[#111111]" /> Single Super Admin Console
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#C6FF2E] fill-[#111111]" /> Branch-wise user roles
            </li>
          </ul>
        </div>
        <div className="lg:col-span-7 bg-[#F8F8F8] border border-[#ECECEC] rounded-3xl p-6 shadow-sm">
          {/* Visual illustration of dashboard */}
          <div className="w-full h-72 rounded-2xl bg-white border border-[#ECECEC] p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center pb-2 border-b border-[#ECECEC]">
              <span className="text-xs font-extrabold text-[#111111]">Branch Terminals</span>
              <span className="px-2 py-0.5 rounded bg-green-50 text-green-600 font-bold text-[9px]">Online</span>
            </div>
            <div className="space-y-3 flex-1 justify-center flex flex-col">
              <div className="flex justify-between items-center text-xs">
                <span>Lahore Branch</span>
                <span className="font-extrabold">Rs 14,250.00</span>
              </div>
              <div className="w-full bg-[#F8F8F8] rounded-full h-2">
                <div className="bg-[#C6FF2E] h-2 rounded-full border border-black/5" style={{ width: '80%' }}></div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span>Islamabad Branch</span>
                <span className="font-extrabold">Rs 8,450.00</span>
              </div>
              <div className="w-full bg-[#F8F8F8] rounded-full h-2">
                <div className="bg-[#111111] h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Showcase Item 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 lg:order-last text-left">
          <span className="text-[10px] font-extrabold text-[#666666] uppercase tracking-wider block mb-2">QR ENGINE</span>
          <h2 className="text-3xl lg:text-[40px] font-black tracking-tight text-[#111111] leading-none mb-4">
            Contact-free Table QR stands.
          </h2>
          <p className="text-sm text-[#666666] leading-relaxed mb-6">
            Create unique QR table cards instantly. Print the design templates, place them at the dining tables, and let your customers order without downloading any apps.
          </p>
          <ul className="space-y-3 text-xs font-semibold text-[#111111]">
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#C6FF2E] fill-[#111111]" /> Dynamic categories & items update
            </li>
            <li className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#C6FF2E] fill-[#111111]" /> Waiter paging integration
            </li>
          </ul>
        </div>
        <div className="lg:col-span-5 bg-[#F8F8F8] border border-[#ECECEC] rounded-3xl p-6 shadow-sm">
          <div className="w-full h-72 rounded-2xl bg-white border border-[#ECECEC] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-28 h-28 bg-[#111111] rounded-2xl p-4 flex items-center justify-center shadow-lg mb-4">
              <QrCode className="w-20 h-20 text-[#C6FF2E]" />
            </div>
            <h4 className="text-sm font-extrabold text-[#111111]">Table Stand #05</h4>
            <p className="text-[10px] text-[#666666] mt-1">Scan to browse Gourmet Bistro Menu</p>
          </div>
        </div>
      </div>
    </section>
  );
}
