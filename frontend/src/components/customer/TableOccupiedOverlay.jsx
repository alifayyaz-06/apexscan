import React from "react";
import { QrCode } from "lucide-react";

export default function TableOccupiedOverlay({
  currentTable,
  occupiedOrderDetails,
  SANS,
  SERIF,
  FontImport
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 text-center"
      style={{
        ...SANS,
        background: "linear-gradient(135deg, #171512 0%, #2A2421 100%)",
      }}
    >
      <FontImport />
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "rgba(230,57,70,0.15)",
          border: "1px solid rgba(230,57,70,0.4)",
        }}
      >
        <QrCode className="w-10 h-10 text-[#E63946]" />
      </div>

      <span className="text-xs font-bold uppercase tracking-widest text-[#E63946] mb-2">
        Table Occupied
      </span>
      <h1 className="text-3xl text-white mb-3" style={SERIF}>
        Table {currentTable} is Currently Occupied
      </h1>
      <p className="text-sm text-white/60 max-w-sm mb-6 leading-relaxed">
        An active order is already in progress at this table. Once the current guests finish their meal and the bill is settled, this table will be available for new QR scans.
      </p>

      <div
        className="w-full max-w-xs rounded-xl p-4 mb-6 text-left"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="text-xs text-white/40 mb-1 font-semibold uppercase tracking-wider">
          Current Session Status
        </div>
        <div className="text-sm font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Order {occupiedOrderDetails?.orderNumber ? `#${occupiedOrderDetails.orderNumber}` : 'In Progress'} ({occupiedOrderDetails?.status || 'cooking'})
        </div>
      </div>
    </div>
  );
}
