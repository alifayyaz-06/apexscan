import React from 'react';

export default function AnalyticsSection() {
  return (
    <section className="reveal-on-scroll max-w-7xl mx-auto px-6 py-20 lg:py-32">
      <div className="text-center mb-16 max-w-xl mx-auto">
        <span className="text-[10px] font-extrabold text-[#666666] uppercase tracking-wider block">ANALYTICS SHOWCASE</span>
        <h2 className="text-3xl lg:text-[48px] font-extrabold text-[#111111] tracking-tight leading-none mt-2">Data-driven operations.</h2>
        <p className="text-sm text-[#666666] mt-4">Gain deep visibility into your customer ordering habits and kitchen turnaround times.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {/* Revenue Card */}
        <div className="bg-white border border-[#ECECEC] p-6 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-zinc-400 block uppercase mb-1">TOTAL REVENUE</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#111111]">Rs 28,450</span>
            <span className="text-xs font-bold text-green-500 font-mono">+18%</span>
          </div>
          <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-4">
            <div className="bg-[#C6FF2E] h-1.5 rounded-full border border-black/5" style={{ width: '70%' }}></div>
          </div>
        </div>

        {/* Orders Card */}
        <div className="bg-white border border-[#ECECEC] p-6 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-zinc-400 block uppercase mb-1">COMPLETED ORDERS</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#111111]">1,280</span>
            <span className="text-xs font-bold text-green-500 font-mono">+12%</span>
          </div>
          <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-4">
            <div className="bg-[#111111] h-1.5 rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>

        {/* Customers Card */}
        <div className="bg-white border border-[#ECECEC] p-6 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-zinc-400 block uppercase mb-1">UNIQUE CUSTOMERS</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#111111]">956</span>
            <span className="text-xs font-bold text-green-500 font-mono">+24%</span>
          </div>
          <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-4">
            <div className="bg-[#C6FF2E] h-1.5 rounded-full border border-black/5" style={{ width: '60%' }}></div>
          </div>
        </div>

        {/* Growth Card */}
        <div className="bg-white border border-[#ECECEC] p-6 rounded-2xl shadow-sm">
          <span className="text-[10px] font-bold text-zinc-400 block uppercase mb-1">MONTHLY GROWTH</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#111111]">34.5%</span>
            <span className="text-xs font-bold text-[#E63946] font-mono">-2.4%</span>
          </div>
          <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-4">
            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '40%' }}></div>
          </div>
        </div>
      </div>
    </section>
  );
}
