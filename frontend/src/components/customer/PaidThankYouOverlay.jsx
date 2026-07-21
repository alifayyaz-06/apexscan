import React from "react";
import { Check } from "lucide-react";
import { formatOrderId } from "../../utils/formatters";

export default function PaidThankYouOverlay({
  activeOrder,
  onNewOrder,
  SANS,
  SERIF,
  FontImport
}) {
  return (
    <div
      className="fixed inset-0 bg-white z-[250] flex flex-col items-center justify-center p-6 text-center animate-fade-in"
      style={SANS}
    >
      <FontImport />
      <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-6 shadow-md">
        <Check className="w-10 h-10 text-emerald-600" />
      </div>
      <h1 className="text-3xl text-zinc-900 mb-2" style={SERIF}>
        Bill Settled & Paid!
      </h1>
      <p className="text-sm text-zinc-500 max-w-sm mb-6 leading-relaxed">
        Thank you for dining with us! Your order #{activeOrder?.order_number || formatOrderId(activeOrder?.id)} has been completed and paid in full.
      </p>

      <button
        onClick={onNewOrder}
        className="px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-full shadow-lg transition-all active:scale-95 cursor-pointer"
      >
        Place Another Order
      </button>
    </div>
  );
}
