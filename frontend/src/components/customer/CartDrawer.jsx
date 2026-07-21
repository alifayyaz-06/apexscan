import React from "react";
import { ShoppingBag, X, Plus, Minus, ArrowRight } from "lucide-react";

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  getItemInfoFromCartKey,
  onQtyChange,
  subtotal,
  tax,
  service,
  total,
  count,
  onPlaceOrder,
  SERIF
}) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end transition-opacity"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white h-full flex flex-col justify-between shadow-2xl animate-slide-left border-l border-zinc-200"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-zinc-900" />
            <h2 className="text-lg font-bold text-zinc-900" style={SERIF}>
              Your Order Basket
            </h2>
            <span className="bg-rose-100 text-rose-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
              {count} items
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {Object.keys(cart).length === 0 ? (
            <div className="text-center py-16 text-zinc-400 flex flex-col items-center gap-3">
              <ShoppingBag className="w-12 h-12 stroke-1 text-zinc-300" />
              <p className="text-sm font-medium">Your basket is empty</p>
            </div>
          ) : (
            Object.keys(cart).map((key) => {
              const info = getItemInfoFromCartKey(key);
              if (!info) return null;
              const qty = cart[key];
              const itemTotal = info.price * qty;

              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-3.5 bg-zinc-50/80 rounded-2xl border border-zinc-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={info.image}
                      alt={info.name}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-zinc-200"
                      onError={(e) => {
                        e.target.src =
                          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";
                      }}
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-zinc-900 truncate">
                        {info.baseName}
                      </h4>
                      {info.size ? (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md mt-0.5">
                          {info.size}
                        </span>
                      ) : null}
                      <div className="text-xs font-bold text-rose-600 font-mono mt-0.5">
                        Rs {info.price.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Qty Controls */}
                    <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-full px-2 py-1 shadow-sm">
                      <button
                        onClick={() => onQtyChange(key, -1)}
                        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-700 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" strokeWidth={2.5} />
                      </button>
                      <span className="text-xs font-bold font-mono min-w-[14px] text-center">
                        {qty}
                      </span>
                      <button
                        onClick={() => onQtyChange(key, 1)}
                        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-700 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" strokeWidth={2.5} />
                      </button>
                    </div>
                    <span className="text-xs font-black font-mono text-zinc-900 min-w-[60px] text-right">
                      Rs {itemTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Billing Footer */}
        {Object.keys(cart).length > 0 && (
          <div className="p-5 sm:p-6 border-t border-zinc-200 bg-white shadow-lg space-y-3">
            <div className="space-y-1.5 text-xs text-zinc-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-medium">Rs {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sales Tax (8%)</span>
                <span className="font-mono font-medium">Rs {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Charge (5%)</span>
                <span className="font-mono font-medium">Rs {service.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-100 font-bold text-base text-zinc-900">
                <span>Total Payable</span>
                <span className="font-mono text-rose-600 font-black">Rs {total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={onPlaceOrder}
              className="w-full py-4 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Confirm & Place Order</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
