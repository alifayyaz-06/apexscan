import React from "react";
import { UtensilsCrossed, Volume2, VolumeX, Maximize2, Minimize2, LogOut, Flame } from "lucide-react";

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
    <header className="bg-zinc-900 border-b border-zinc-800 text-white py-3.5 px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40 shadow-xl">
      {/* Title & Brand */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-600/30">
            <Flame className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
              <span>Kitchen Display System</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full">
                KDS
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              {restaurantName || "Smart QR Restaurant"}
            </p>
          </div>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
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
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                  : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <span>{opt.label}</span>
              {opt.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-zinc-700 text-zinc-300"
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
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            soundEnabled
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-zinc-800 text-zinc-400 border-zinc-700"
          }`}
        >
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <span>{soundEnabled ? "Chime On" : "Muted"}</span>
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer border border-zinc-700"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
        >
          <LogOut size={14} />
          <span>Exit KDS</span>
        </button>
      </div>
    </header>
  );
}
