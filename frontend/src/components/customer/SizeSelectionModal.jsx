import React from "react";

export default function SizeSelectionModal({
  sizeModalItem,
  selectedSizeObj,
  setSelectedSizeObj,
  onClose,
  onAdd
}) {
  if (!sizeModalItem || !selectedSizeObj) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-pop-in border border-zinc-100 flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex gap-3 items-center">
            <img
              src={sizeModalItem.image}
              alt={sizeModalItem.name}
              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-zinc-100 bg-zinc-50"
              onError={(e) => {
                e.target.src =
                  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";
              }}
            />
            <div>
              <h3 className="text-base font-bold text-zinc-900 leading-snug">
                {sizeModalItem.name}
              </h3>
              <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5 font-normal">
                {sizeModalItem.description || "Select size option"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-900 flex items-center justify-center text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Options List */}
        <div className="flex flex-col gap-2.5 my-1">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Select Size Option
          </label>
          {sizeModalItem.sizes.map((s, idx) => {
            const isSelected = selectedSizeObj.name === s.name;
            const priceNum = parseFloat(s.price);

            return (
              <div
                key={idx}
                onClick={() => setSelectedSizeObj(s)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-rose-50/70 border-rose-600 text-rose-950 shadow-sm"
                    : "bg-white border-zinc-200 text-zinc-800 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? "border-rose-600 bg-rose-600"
                        : "border-zinc-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-sm font-bold">{s.name}</span>
                </div>
                <span className="text-sm font-black font-mono text-rose-600">
                  Rs {priceNum.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <button
          onClick={onAdd}
          className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Add to Basket</span>
          <span>•</span>
          <span>Rs {parseFloat(selectedSizeObj.price).toFixed(2)}</span>
        </button>
      </div>
    </div>
  );
}
