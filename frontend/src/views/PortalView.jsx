import React, { useState } from 'react';

export default function PortalView() {
  const [selectedTable, setSelectedTable] = useState('1');

  const tables = [
    { num: '1', desc: 'Table 1 (Window View)' },
    { num: '2', desc: 'Table 2 (Window View)' },
    { num: '3', desc: 'Table 3 (Cozy Corner)' },
    { num: '4', desc: 'Table 4 (Cozy Corner)' },
    { num: '5', desc: 'Table 5 (Main Hall - Large)' },
    { num: '6', desc: 'Table 6 (Main Hall - Medium)' },
    { num: '7', desc: 'Table 7 (Main Hall - Small)' },
    { num: '8', desc: 'Table 8 (Bar counter)' },
    { num: '9', desc: 'Table 9 (Bar counter)' },
    { num: '10', desc: 'Table 10 (Outdoor Patio)' }
  ];

  // Detect dynamic restaurant slug from path prefix (e.g. /r/kfc)
  const pathMatch = window.location.pathname.match(/^\/r\/([^/]+)/);
  const currentSlug = pathMatch ? pathMatch[1] : null;

  // Target URL for scanning
  const targetUrl = currentSlug
    ? `${window.location.protocol}//${window.location.hostname}:3006/r/${currentSlug}/customer?table=${selectedTable}`
    : `${window.location.protocol}//${window.location.hostname}:3006/customer?table=${selectedTable}`;
  
  // Clean QR Server API URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=000000&bgcolor=ffffff&qzone=1&data=${encodeURIComponent(targetUrl)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] text-[#2B2D42] py-12 px-4 sm:px-6 print:p-0 print:bg-white print:text-black">
      <div className="max-w-6xl mx-auto print:max-w-full">
        {/* Header Block */}
        <header className="relative text-center mb-12 animate-fade-in print:hidden">
          <div className="absolute right-0 top-0">
            <a
              href={currentSlug ? `/r/${currentSlug}/login` : "/login"}
              className="px-4 py-2 border border-slate-200 hover:border-[#E63946] text-xs font-bold text-[#2B2D42] hover:text-[#E63946] rounded-xl bg-white shadow-sm transition-all"
            >
              🔑 Staff Sign In
            </a>
          </div>
          <div className="text-[#E63946] font-extrabold text-sm uppercase tracking-widest mb-2">
            Restaurant Admin Portal
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#2B2D42] mb-2">
            <span className="font-playwrite text-[#2B2D42]">Gourmet</span>
            <span className="font-playwrite text-[#E63946]">Bistro</span>
          </h1>
          <p className="text-lg font-semibold text-[#2B2D42] mb-4">Apex Scan Hub</p>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Welcome to the terminal hub. Generate stands, monitor kitchen queues, edit items, and settle billing details.
          </p>
          <div className="h-1 w-16 bg-[#E63946] mx-auto mt-6 rounded-full"></div>
        </header>

        {/* Dashboard Modules Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in print:hidden">
          {/* Customer View */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_8px_20px_rgba(0,0,0,0.035)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.055)] transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="text-3xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-[#2B2D42] mb-2">1. Customer Menu View</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Scan table stands to open. Features a modern welcome screen, clean light-themed catalog, active cart selection, and real-time step trackers.
              </p>
            </div>
            <a
              href={currentSlug ? `/r/${currentSlug}/customer?table=${selectedTable}` : `/customer?table=${selectedTable}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-center rounded-xl shadow-md shadow-[#E63946]/20 transition-colors"
            >
              Open Customer View (Table {selectedTable})
            </a>
          </div>

          {/* Waiter View */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_8px_20px_rgba(0,0,0,0.035)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.055)] transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="text-3xl mb-4">💼</div>
              <h3 className="text-xl font-bold text-[#2B2D42] mb-2">2. Waiter Terminal</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Manage order lifecycle: confirm reviews, edit items, route to served, collect bill checkouts, and print physical POS receipts.
              </p>
            </div>
            <a
              href={currentSlug ? `/r/${currentSlug}/waiter` : "/waiter"}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-center rounded-xl shadow-md shadow-indigo-600/20 transition-colors"
            >
              Open Waiter Dashboard
            </a>
          </div>

          {/* Kitchen View */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_8px_20px_rgba(0,0,0,0.035)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.055)] transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="text-3xl mb-4">🍳</div>
              <h3 className="text-xl font-bold text-[#2B2D42] mb-2">3. Kitchen Display (KDS)</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Backlog monitoring dashboard for cooking staff. Mark food progress, trigger warnings, checklist items, and alert table waiters.
              </p>
            </div>
            <a
              href={currentSlug ? `/r/${currentSlug}/kitchen` : "/kitchen"}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-center rounded-xl shadow-md shadow-emerald-600/20 transition-colors"
            >
              Open Kitchen Display (KDS)
            </a>
          </div>
        </section>

        {/* QR Generator Section */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-10 shadow-[0_8px_20px_rgba(0,0,0,0.035)] flex flex-col lg:flex-row gap-8 items-center animate-fade-in print:border-none print:p-0 print:bg-white print:text-black">
          <div className="flex-1 w-full print:hidden">
            <h2 className="text-2xl font-extrabold text-[#2B2D42] mb-3">Generate Table QR Stands</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Each table has a unique QR code. Select a table number below to generate its stand. Print the stand and place it at the table. Customers scan it with their phone to order.
            </p>
            
            <div className="mb-6">
              <label className="block text-[#2B2D42] font-bold text-xs uppercase mb-2">Select Table</label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-[#2B2D42] font-medium focus:border-[#E63946] outline-none transition-colors"
              >
                {tables.map(t => (
                  <option key={t.num} value={t.num}>{t.desc}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePrint}
              className="px-6 py-3.5 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold rounded-xl shadow-md shadow-[#E63946]/20 transition-all flex items-center justify-center gap-2"
            >
              🖨️ Print Stand Card
            </button>
          </div>

          {/* Stand Display Card */}
          <div className="w-full max-w-sm shrink-0 border border-slate-200 rounded-2xl p-6 bg-[#F9F9F9] flex flex-col items-center text-center shadow-[0_8px_20px_rgba(0,0,0,0.035)] print:border-2 print:border-black print:max-w-md print:mx-auto print:bg-white print:text-black">
            <div className="text-[#E63946] font-black text-sm tracking-wider uppercase mb-1">Welcome to Our Table</div>
            <div className="text-2xl font-black text-[#2B2D42] mb-6 print:text-black">TABLE {selectedTable}</div>

            <div className="bg-white p-4 rounded-xl shadow-md mb-6">
              <img
                src={qrCodeUrl}
                alt={`Table ${selectedTable} QR Code`}
                className="w-40 h-40 object-contain"
              />
            </div>

            <div className="text-slate-500 text-xs leading-relaxed max-w-xs mb-4 print:text-slate-700">
              Scan this QR Code using your phone camera to view the menu catalog and place your order.
            </div>
            
            <div className="text-[#E63946] font-bold text-sm tracking-widest uppercase mb-4 print:text-[#E63946]">
              <span className="font-playwrite text-[#2B2D42]">Gourmet</span>
              <span className="font-playwrite text-[#E63946]">Bistro</span>
            </div>
            
            <a
              href={targetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#E63946] hover:text-[#FF6B35] underline font-medium print:hidden"
            >
              Test Scan (Table {selectedTable})
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
