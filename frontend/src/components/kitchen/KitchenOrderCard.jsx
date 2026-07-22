import React from "react";
import { Clock, Check } from "lucide-react";
import { formatOrderId } from "../../utils/formatters";
import { calculateElapsedMinutes, getKitchenStatusBadge } from "../../utils/kitchenConstants";

export default function KitchenOrderCard({
  order,
  completedItemsMap,
  onToggleItemCheck,
  onUpdateStatus
}) {
  const badge = getKitchenStatusBadge(order.status || "pending");
  const elapsedTime = calculateElapsedMinutes(order.created_at || order.createdAt);
  const isPending = order.status === "pending";
  const isCooking = order.status === "cooking";
  const isReady = order.status === "ready";

  return (
    <div
      className={`bg-white border rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between transition-all ${
        isPending
          ? "border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/20"
          : isCooking
          ? "border-blue-200"
          : "border-zinc-200"
      }`}
    >
      <div>
        {/* Card Top Row */}
        <div className="flex justify-between items-start pb-3.5 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider bg-zinc-900 text-white px-2.5 py-0.5 rounded-full">
                Table {order.tableNumber || order.table || "1"}
              </span>
              {order.order_source === 'waiter' ? (
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full shadow-xs">
                  WAITER ({order.billing?.waiterName || 'Staff'})
                </span>
              ) : order.order_source === 'seller' ? (
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white px-2.5 py-0.5 rounded-full">
                  SELLER POS
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  CUSTOMER QR
                </span>
              )}
              <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 font-mono ml-auto">
                <Clock className="w-3 h-3 text-zinc-400" />
                <span>{elapsedTime}</span>
              </div>
            </div>
            <h3 className="text-lg font-extrabold text-zinc-900 mt-1.5">
              Order #{order.order_number || formatOrderId(order.id)}
            </h3>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${badge.bg}`}>
            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>

        {/* Ordered Items Checklist */}
        <div className="my-4 space-y-2.5">
          {order.items?.map((item, idx) => {
            const itemKey = `${order.id}_item_${idx}`;
            const isChecked = Boolean(completedItemsMap[itemKey]);

            return (
              <div
                key={idx}
                onClick={() => onToggleItemCheck(itemKey)}
                className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                  isChecked
                    ? "bg-zinc-100/80 border-zinc-200 text-zinc-400 line-through"
                    : "bg-zinc-50 border-zinc-200/90 text-zinc-900 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                      isChecked
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-zinc-300 bg-white"
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className="text-sm font-bold truncate">{item.name}</span>
                </div>
                <span className="text-sm font-black font-mono bg-white border border-zinc-200 px-2.5 py-0.5 rounded-lg shrink-0 ml-2">
                  ×{item.quantity}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card Action Button */}
      <div className="pt-3 border-t border-zinc-100">
        {isPending && (
          <button
            onClick={() => onUpdateStatus(order.id, "cooking")}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer"
          >
            Start Cooking
          </button>
        )}
        {isCooking && (
          <button
            onClick={() => onUpdateStatus(order.id, "ready")}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer"
          >
            Mark Ready to Serve
          </button>
        )}
        {isReady && (
          <button
            onClick={() => onUpdateStatus(order.id, "served")}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer"
          >
            Serve Order ✓
          </button>
        )}
        {order.status === "served" && (
          <span className="w-full py-2.5 bg-zinc-100 text-zinc-500 font-bold text-xs rounded-2xl text-center block">
            Order Served at Table
          </span>
        )}
      </div>
    </div>
  );
}
