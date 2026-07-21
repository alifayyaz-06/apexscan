import React from "react";
import { Clock, Check } from "lucide-react";
import { formatOrderId } from "../../utils/formatters";

export default function ActiveOrderTracker({ activeOrder, currentTable, SERIF, MUTED, LINE }) {
  if (!activeOrder) return null;

  const statusMap = {
    pending: { label: "Order Received", color: "bg-amber-500", text: "text-amber-900", bg: "bg-amber-50" },
    cooking: { label: "Preparing in Kitchen", color: "bg-blue-500", text: "text-blue-900", bg: "bg-blue-50" },
    ready: { label: "Ready to Serve", color: "bg-emerald-500", text: "text-emerald-900", bg: "bg-emerald-50" },
    served: { label: "Served at Table", color: "bg-teal-500", text: "text-teal-900", bg: "bg-teal-50" },
  };

  const statusInfo = statusMap[activeOrder.status] || {
    label: activeOrder.status,
    color: "bg-zinc-500",
    text: "text-zinc-900",
    bg: "bg-zinc-50"
  };

  return (
    <div className="mb-8 p-5 sm:p-6 bg-white border border-zinc-200 rounded-3xl shadow-sm space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">
            Live Order Tracking
          </span>
          <h3 className="text-lg font-bold text-zinc-900" style={SERIF}>
            Order #{activeOrder.order_number || formatOrderId(activeOrder.id)}
          </h3>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${statusInfo.bg} ${statusInfo.text}`}>
          <span className={`w-2 h-2 rounded-full ${statusInfo.color} animate-pulse`} />
          <span>{statusInfo.label}</span>
        </div>
      </div>

      {/* Item Summary List */}
      <div className="space-y-2">
        {activeOrder.items?.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-xs text-zinc-600">
            <span>
              {item.name} <span className="font-bold text-zinc-900">×{item.quantity}</span>
            </span>
            <span className="font-mono font-semibold">Rs {(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-zinc-100 flex justify-between items-center text-xs">
        <span className="text-zinc-400">Total Amount</span>
        <span className="text-base font-black font-mono text-rose-600">
          Rs {activeOrder.billing?.total?.toFixed(2) || "0.00"}
        </span>
      </div>
    </div>
  );
}
