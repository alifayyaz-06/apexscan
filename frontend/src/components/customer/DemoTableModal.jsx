import React from "react";
import { QrCode } from "lucide-react";

export default function DemoTableModal({
  selectedDemoTable,
  setSelectedDemoTable,
  onSubmit,
  SANS,
  SERIF,
  LINE,
  MUTED,
  FontImport
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center p-6"
      style={SANS}
    >
      <FontImport />
      <div
        className="bg-white text-[#171512] w-full max-w-sm p-8 rounded-2xl text-center border"
        style={{ borderColor: LINE }}
      >
        <div
          className="w-12 h-12 border rounded-xl flex items-center justify-center mx-auto mb-5"
          style={{ borderColor: LINE }}
        >
          <QrCode className="w-6 h-6 text-[#171512]" />
        </div>
        <h2 className="text-lg mb-2 text-[#171512]" style={SERIF}>
          Table QR Required
        </h2>
        <p
          className="text-xs leading-relaxed mb-6 max-w-xs mx-auto"
          style={{ color: MUTED }}
        >
          Please scan the QR code at your table. Or select a demo table number
          below to test ordering.
        </p>
        <div className="mb-6">
          <label
            className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-left mb-2 pl-1"
            style={{ color: MUTED }}
          >
            Select Demo Table
          </label>
          <select
            value={selectedDemoTable}
            onChange={(e) => setSelectedDemoTable(e.target.value)}
            className="w-full p-3 bg-white border rounded-xl text-[#171512] text-sm font-medium focus:outline-none cursor-pointer"
            style={{ borderColor: LINE }}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                Table {i + 1}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onSubmit}
          className="w-full py-3.5 bg-[#171512] hover:bg-black text-white font-semibold text-xs uppercase tracking-[0.15em] rounded-full transition-all cursor-pointer"
        >
          Start Ordering
        </button>
      </div>
    </div>
  );
}
