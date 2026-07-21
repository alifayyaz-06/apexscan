import React from "react";
import { Search, Flame, UtensilsCrossed } from "lucide-react";

export default function CustomerHeader({
  restaurantInfo,
  restaurantName,
  currentTable,
  searchTerm,
  setSearchTerm,
  category,
  setCategory,
  categories,
  SERIF
}) {
  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-sm transition-all">
      {/* Restaurant Header */}
      <header className="py-3 px-4 sm:px-6 flex justify-between items-center max-w-[880px] mx-auto">
        <div className="flex items-center gap-3">
          {restaurantInfo?.logo_url && (
            <img
              src={restaurantInfo.logo_url}
              className="h-8 w-8 object-contain"
              alt={restaurantName}
            />
          )}
          <span className="text-lg sm:text-xl font-bold text-[#171512]" style={SERIF}>
            {restaurantName}
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] bg-zinc-100 px-2.5 py-1 rounded-full text-zinc-600">
          Table {currentTable}
        </span>
      </header>

      {/* Sticky Search Bar & Category Quick Links Container */}
      <div className="max-w-[880px] mx-auto px-4 sm:px-6 pt-1 pb-3 flex flex-col gap-3">
        {/* Search Bar */}
        <div className="relative w-full">
          <div className="flex items-center gap-3 bg-zinc-100/90 border border-zinc-200/80 rounded-full px-4 py-2.5 shadow-inner transition-colors focus-within:border-zinc-400 focus-within:bg-white">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <input
              type="text"
              placeholder="Would you like to eat something?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow bg-transparent text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-900 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Quick Links Category Selector Chips */}
        <nav className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((catId) => {
            const label =
              catId === "all"
                ? "All"
                : catId.charAt(0).toUpperCase() + catId.slice(1);
            const isActive = category === catId;

            return (
              <button
                key={catId}
                onClick={() => setCategory(catId)}
                className={`flex items-center gap-1.5 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all focus:outline-none cursor-pointer border ${
                  isActive
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {catId === "all" ? (
                  <Flame className={`w-3.5 h-3.5 ${isActive ? "fill-white text-white" : "text-amber-500"}`} />
                ) : (
                  <UtensilsCrossed className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-zinc-400"}`} />
                )}
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
