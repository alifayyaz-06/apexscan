import React from "react";
import { Star, Clock, Plus, Minus } from "lucide-react";

export default function FoodCategoryCard({ item, cartQty, onQtyChange, onOpenSizeModal }) {
  const rating = typeof item.rating === "number" ? item.rating : 4.8;
  const prepTime = item.prep_time || item.prepTime || "25–35 min";

  const hasSizes = Array.isArray(item.sizes) && item.sizes.length > 0;
  const minPrice = hasSizes
    ? Math.min(...item.sizes.map((s) => parseFloat(s.price) || 0))
    : item.price;

  return (
    <div
      onClick={() => {
        if (hasSizes) onOpenSizeModal(item);
      }}
      className="flex gap-3.5 sm:gap-4 items-center p-3.5 sm:p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-sm hover:border-zinc-300 transition-all w-full cursor-pointer"
    >
      {/* Photo (Left) */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-zinc-100 shrink-0 border border-zinc-100">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src =
              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";
          }}
        />
      </div>

      {/* Details (Right Column) */}
      <div className="flex-grow min-w-0 flex flex-col justify-between self-stretch py-0.5">
        <div>
          {/* Top Row: Name + Star Rating Badge */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 leading-snug line-clamp-1">
              {item.name}
            </h3>
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full text-[11px] font-bold text-amber-900 shrink-0">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Line 2: Small food description */}
          {item.description ? (
            <p className="text-xs text-zinc-500 line-clamp-1 mt-1 font-normal">
              {item.description}
            </p>
          ) : null}

          {/* Line 3: Clock icon + prep time */}
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1">
            <Clock className="w-3 h-3 shrink-0 text-zinc-400" />
            <span>{prepTime}</span>
          </div>
        </div>

        {/* Bottom Row: Price & Action */}
        <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-zinc-100">
          <div>
            {hasSizes ? (
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Starting from</span>
                <span className="text-base sm:text-lg font-black text-rose-600 font-mono">
                  Rs {minPrice.toFixed(2)}
                </span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-zinc-400">Rs</span>
                <span className="text-base sm:text-lg font-black text-rose-600 font-mono">
                  {item.price.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Add / Qty Control Pill */}
          {hasSizes ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSizeModal(item);
              }}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>{cartQty > 0 ? `Select (${cartQty})` : "Select Size"}</span>
            </button>
          ) : cartQty > 0 ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 bg-zinc-950 text-white rounded-full px-2.5 py-1 shadow-sm"
            >
              <button
                onClick={() => onQtyChange(item.id, -1)}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
              >
                <Minus className="w-3 h-3" strokeWidth={2.5} />
              </button>
              <span className="text-xs font-bold min-w-[14px] text-center font-mono">
                {cartQty}
              </span>
              <button
                onClick={() => onQtyChange(item.id, 1)}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQtyChange(item.id, 1);
              }}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
