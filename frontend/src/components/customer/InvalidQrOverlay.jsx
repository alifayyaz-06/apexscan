import React from "react";
import { X } from "lucide-react";

export default function InvalidQrOverlay({ SANS, FontImport }) {
  return (
    <div
      className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center"
      style={SANS}
    >
      <FontImport />
      <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
        <X className="w-10 h-10 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Invalid or Tampered QR Code</h1>
      <p className="text-sm text-zinc-400 max-w-sm mb-6 leading-relaxed">
        The table QR link you opened was modified or corrupted. Direct table URLs without a valid assigned table code are prohibited.
      </p>
      <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">
        Please scan the official QR stand at your table.
      </p>
    </div>
  );
}
