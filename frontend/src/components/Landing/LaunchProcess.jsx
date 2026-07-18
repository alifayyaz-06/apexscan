import React from 'react';

export default function LaunchProcess() {
  return (
    <section className="reveal-on-scroll bg-[#F8F8F8] border-y border-[#ECECEC] py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 max-w-xl mx-auto">
          <span className="text-[10px] font-extrabold text-[#666666] uppercase tracking-wider block">LAUNCH PROCESS</span>
          <h2 className="text-3xl lg:text-[48px] font-extrabold text-[#111111] tracking-tight leading-none mt-2">How it works.</h2>
          <p className="text-sm text-[#666666] mt-4">Set up your portal and begin accepting orders in under 15 minutes.</p>
        </div>
        
        {/* 4 Steps visual layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto relative">
          {/* Step 1 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-sm relative">
            <span className="w-7 h-7 rounded-lg bg-[#C6FF2E] text-[#111111] font-black text-xs flex items-center justify-center mb-4">1</span>
            <h3 className="font-extrabold text-sm text-[#111111] mb-2">Restaurant Signs Up</h3>
            <p className="text-[#666666] text-xs leading-relaxed">
              Create your tenant profile and enter your base branch location configurations.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-sm relative">
            <span className="w-7 h-7 rounded-lg bg-[#C6FF2E] text-[#111111] font-black text-xs flex items-center justify-center mb-4">2</span>
            <h3 className="font-extrabold text-sm text-[#111111] mb-2">Creates QR Menu</h3>
            <p className="text-[#666666] text-xs leading-relaxed">
              Populate your categories, add food items with images, and configure modifiers.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-sm relative">
            <span className="w-7 h-7 rounded-lg bg-[#C6FF2E] text-[#111111] font-black text-xs flex items-center justify-center mb-4">3</span>
            <h3 className="font-extrabold text-sm text-[#111111] mb-2">Customers Scan & Order</h3>
            <p className="text-[#666666] text-xs leading-relaxed">
              Guests scan table QR codes, select dishes, build carts, and checkout seamlessly.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-sm relative">
            <span className="w-7 h-7 rounded-lg bg-[#C6FF2E] text-[#111111] font-black text-xs flex items-center justify-center mb-4">4</span>
            <h3 className="font-extrabold text-sm text-[#111111] mb-2">Receive Orders</h3>
            <p className="text-[#666666] text-xs leading-relaxed">
              Orders sync instantly to your KDS kitchen screens and cashier billing consoles.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
