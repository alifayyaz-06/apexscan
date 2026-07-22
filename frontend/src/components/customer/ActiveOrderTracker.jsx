import React from "react";
import { Check } from "lucide-react";
import { formatOrderId } from "../../utils/formatters";

const INK = "#171512";
const MUTED = "#8A8580";
const LINE = "#EBE7E0";
const WINE = "#7A2331";
const SERIF = { fontFamily: "'Roboto Condensed', sans-serif" };
const SANS = { fontFamily: "'Roboto Condensed', sans-serif" };

export default function ActiveOrderTracker({ activeOrder, currentTable }) {
  if (!activeOrder) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-5" style={SANS}>
      <div
        className="bg-white text-[#171512] w-full max-w-[480px] border p-6 rounded-2xl max-h-[90vh] overflow-y-auto"
        style={{ borderColor: LINE }}
      >
        <div
          className="flex items-center gap-3 border-b pb-4 mb-6"
          style={{ borderColor: LINE }}
        >
          <h2 className="text-base flex-grow text-[#171512]" style={SERIF}>
            Track Your Order
          </h2>
          <span
            className="border font-mono text-[10px] font-semibold px-3 py-1 rounded-lg"
            style={{ borderColor: LINE, color: MUTED }}
          >
            Table {currentTable}
          </span>
        </div>

        {/* Stepper Graphics Timeline */}
        <div className="flex flex-col gap-5 mb-8 relative pl-6">
          <div
            className="absolute left-[11px] top-2 bottom-2 w-[2px]"
            style={{ backgroundColor: LINE }}
          />
          {[
            {
              id: "pending",
              title: "Order Placed",
              desc: "Sent to the kitchen, waiting for review",
            },
            {
              id: "confirmed",
              title: "Confirmed",
              desc: "Accepted and queued",
            },
            {
              id: "cooking",
              title: "Preparing",
              desc: "Chef is crafting your meal",
            },
            {
              id: "ready",
              title: "Ready",
              desc: "On its way to your table",
            },
            { id: "completed", title: "Served", desc: "Enjoy your meal" },
          ].map((step, idx) => {
            const stepsList = [
              "pending",
              "confirmed",
              "cooking",
              "ready",
              "completed",
            ];
            const currentIdx = stepsList.indexOf(activeOrder.status);
            const isCompleted = idx < currentIdx;
            const isActive = idx === currentIdx;

            return (
              <div
                key={step.id}
                className="relative flex gap-4 items-start transition-all duration-300"
                style={{
                  opacity: isActive ? 1 : isCompleted ? 0.85 : 0.35,
                }}
              >
                {/* Circle timeline Indicator */}
                <div
                  className="absolute -left-[21px] w-6 h-6 rounded-full font-semibold text-xs flex items-center justify-center shrink-0 border-2 z-10 bg-white transition-colors"
                  style={{
                    borderColor: isCompleted || isActive ? WINE : "#DDDDDD",
                    backgroundColor: isActive ? WINE : "#FFFFFF",
                    color: isActive
                      ? "#FFFFFF"
                      : isCompleted
                        ? WINE
                        : "#AAAAAA",
                  }}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                  ) : (
                    idx + 1
                  )}
                </div>

                <div className="pl-2">
                  <div
                    className="font-semibold text-sm"
                    style={{ color: isActive ? INK : "#555555" }}
                  >
                    {step.title}
                  </div>
                  <div
                    className="text-[11px] mt-0.5"
                    style={{ color: MUTED }}
                  >
                    {step.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mini invoice summary */}
        <div
          className="border p-5 rounded-xl mb-6"
          style={{ borderColor: LINE }}
        >
          <h3 className="font-semibold text-xs uppercase tracking-wider mb-3 text-[#171512]">
            Order Details
          </h3>
          <ul className="flex flex-col gap-2.5">
            {(activeOrder.items || []).map((item, idx) => (
              <li
                key={idx}
                className="flex justify-between text-xs"
                style={{ color: MUTED }}
              >
                <span>
                  {item.name}{" "}
                  <span className="font-semibold text-[#171512]">
                    x{item.quantity}
                  </span>
                </span>
                <span>Rs {(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div
            className="border-t my-4"
            style={{ borderColor: LINE }}
          ></div>
          <div className="flex justify-between items-baseline font-semibold text-sm text-[#171512]">
            <span>Total</span>
            <span className="text-base italic" style={SERIF}>
              Rs {activeOrder.billing?.total?.toFixed(2) || "0.00"}
            </span>
          </div>
        </div>

        <div className="text-center text-[10px] text-zinc-400 font-mono">
          Order #{activeOrder.order_number || formatOrderId(activeOrder.id)}
        </div>
      </div>
    </div>
  );
}
