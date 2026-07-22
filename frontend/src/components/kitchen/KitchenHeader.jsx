import React from "react";
import { UtensilsCrossed, Volume2, VolumeX, Maximize2, Minimize2, LogOut } from "lucide-react";

const SERIF = { fontFamily: "'Fraunces', ui-serif, Georgia, serif" };
const SANS = { fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" };

export default function KitchenHeader({
  restaurantName,
  filter,
  setFilter,
  soundEnabled,
  setSoundEnabled,
  isFullscreen,
  toggleFullscreen,
  onLogout,
  counts
}) {
  const filterOptions = [
    { id: "all", label: "All Orders", count: counts.all },
    { id: "pending", label: "Pending", count: counts.pending },
    { id: "cooking", label: "Cooking", count: counts.cooking },
    { id: "ready", label: "Ready", count: counts.ready },
  ];

  return (
    <header className="bg-white border-b border-[#EBE7E0] py-3.5 px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40 shadow-xs" style={SANS}>
      {/* Title & Brand */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#171512] flex items-center justify-center text-white font-bold">
            <UtensilsCrossed size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#171512] flex items-center gap-2" style={SERIF}>
              <span>Kitchen Display</span>
              <span className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-[#8A8580] bg-[#F9F8F6] border border-[#EBE7E0] px-2 py-0.5 rounded-md">
                KDS
              </span>
            </h1>
            <p className="text-[11px] text-[#8A8580] font-medium">
              {restaurantName || "Smart QR Restaurant"}
            </p>
          </div>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-[#F9F8F6] border border-[#EBE7E0] text-[#8A8580] hover:text-[#171512] cursor-pointer"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100 cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Filter Status Pills */}
      <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
        {filterOptions.map((opt) => {
          const isActive = filter === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#171512] text-white shadow-xs"
                  : "bg-[#F9F8F6] text-[#8A8580] border border-[#EBE7E0] hover:text-[#171512]"
              }`}
            >
              <span>{opt.label}</span>
              {opt.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-[#EBE7E0] text-[#171512]"
                }`}>
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop Controls */}
      <div className="hidden md:flex items-center gap-3">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            soundEnabled
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-[#F9F8F6] text-[#8A8580] border-[#EBE7E0]"
          }`}
        >
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <span>{soundEnabled ? "Chime On" : "Muted"}</span>
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-xl bg-[#F9F8F6] hover:bg-zinc-100 text-[#8A8580] hover:text-[#171512] transition-all cursor-pointer border border-[#EBE7E0]"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80 transition-all cursor-pointer"
        >
          <LogOut size={14} />
          <span>Exit KDS</span>
        </button>
      </div>
    </header>
  );
}
