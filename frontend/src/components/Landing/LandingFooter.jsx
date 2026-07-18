import React from 'react';
import { QrCode } from 'lucide-react';

export default function LandingFooter({ WHATSAPP_NUMBER, SUPPORT_EMAIL }) {
  return (
    <footer className="border-t border-[#ECECEC] bg-[#F8F8F8] py-12 text-[#666666]">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        {/* Brand Info */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-[#111111] rounded flex items-center justify-center text-white font-extrabold text-xs">
              <QrCode className="w-3.5 h-3.5 text-[#C6FF2E]" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-[#111111]">Apex Scan</span>
          </div>
          <p className="text-[11px] text-[#666666] leading-relaxed max-w-xs">
            Cloud-based operations management SaaS suite for branches, digital table ordering, kitchen backlogs, and cashier POS checkouts.
          </p>
        </div>

        {/* Links Column 1 */}
        <div>
          <h4 className="font-extrabold text-xs text-[#111111] uppercase tracking-wider mb-4">Product</h4>
          <ul className="space-y-2 text-[11px]">
            <li><a href="#features" className="hover:text-[#111111] transition-colors">Menu Catalog</a></li>
            <li><a href="#features" className="hover:text-[#111111] transition-colors">Kitchen Queue (KDS)</a></li>
            <li><a href="#features" className="hover:text-[#111111] transition-colors">Cashier POS Desk</a></li>
          </ul>
        </div>

        {/* Links Column 2 */}
        <div>
          <h4 className="font-extrabold text-xs text-[#111111] uppercase tracking-wider mb-4">Company</h4>
          <ul className="space-y-2 text-[11px]">
            <li><a href="#" className="hover:text-[#111111] transition-colors">About Us</a></li>
            <li><a href="#contact" className="hover:text-[#111111] transition-colors">Contact Support</a></li>
          </ul>
        </div>

        {/* Links Column 3 */}
        <div>
          <h4 className="font-extrabold text-xs text-[#111111] uppercase tracking-wider mb-4">Support & Legal</h4>
          <ul className="space-y-2 text-[11px]">
            <li><a href="#faq" className="hover:text-[#111111] transition-colors">Setup Guides</a></li>
            <li><a href="#" className="hover:text-[#111111] transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-[#111111] transition-colors">Terms of Service</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 border-t border-[#ECECEC] pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-zinc-400">
        <p>© {new Date().getFullYear()} Apex Scan. Designed for world-class operators.</p>
        <div className="flex gap-4">
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="hover:text-[#111111] transition-colors">WhatsApp support</a>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-[#111111] transition-colors">Support Email</a>
        </div>
      </div>
    </footer>
  );
}
