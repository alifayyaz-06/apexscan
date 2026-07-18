import React from 'react';
import { 
  QrCode, ShoppingBag, Clock, CreditCard, UtensilsCrossed, TrendingUp, Layers, ShieldCheck, Gift 
} from 'lucide-react';

export default function FeatureGrid() {
  return (
    <section id="features" className="reveal-on-scroll bg-[#F8F8F8] border-t border-[#ECECEC] py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 max-w-xl mx-auto">
          <span className="text-[10px] font-extrabold text-[#666666] uppercase tracking-wider block">CORE CAPABILITIES</span>
          <h2 className="text-3xl lg:text-[48px] font-extrabold text-[#111111] tracking-tight leading-none mt-2">Engineered for growth.</h2>
          <p className="text-sm text-[#666666] mt-4">Everything your restaurant brand needs to scale, built on a secure cloud infrastructure.</p>
        </div>
        
        {/* 9 Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Feature 1 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F8] group-hover:bg-[#C6FF2E] flex items-center justify-center text-[#111111] mb-6 transition-colors">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-[#111111] mb-2">QR Menus</h3>
            <p className="text-[#666666] text-xs leading-relaxed">
              Generate high-resolution branch-specific QR code stands. Customers scan, browse categories, and place orders directly to kitchen tables.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F8] group-hover:bg-[#C6FF2E] flex items-center justify-center text-[#111111] mb-6 transition-colors">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-[#111111] mb-2">Online Ordering</h3>
            <p className="text-[#666666] text-xs leading-relaxed">
              Accept delivery, pickup, or dine-in orders instantly from a clean mobile-first web app that integrates directly with your active database.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F8] group-hover:bg-[#C6FF2E] flex items-center justify-center text-[#111111] mb-6 transition-colors">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-[#111111] mb-2">Reservations</h3>
            <p className="text-[#666666] text-xs leading-relaxed">
              A simple visual table reservation engine allowing users to select tables, book dates, and coordinate table rotations.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F8] group-hover:bg-[#C6FF2E] flex items-center justify-center text-[#111111] mb-6 transition-colors">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-[#111111] mb-2">Secure Payments</h3>
            <p className="text-[#666666] text-xs leading-relaxed">
              Accept payments securely via Card, Cash, or online checkouts with automated receipts and customizable branch tax configurations.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F8] group-hover:bg-[#C6FF2E] flex items-center justify-center text-[#111111] mb-6 transition-colors">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-[#111111] mb-2">Kitchen Dashboard</h3>
            <p className="text-[#666666] text-xs leading-relaxed">
              Provide chef stations with dynamic prep backlogs, cooking timers, completed checks, and real-time synchronization.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F8] group-hover:bg-[#C6FF2E] flex items-center justify-center text-[#111111] mb-6 transition-colors">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-[#111111] mb-2">Business Analytics</h3>
            <p className="text-[#666666] text-xs leading-relaxed">
              Generate real-time analytics reports, track branch revenue, catalog popular items, and monitor overall business growth.
            </p>
          </div>

          {/* Feature 7 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F8] group-hover:bg-[#C6FF2E] flex items-center justify-center text-[#111111] mb-6 transition-colors">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-[#111111] mb-2">Multi-Branch Setup</h3>
            <p className="text-[#666666] text-xs leading-relaxed">
              Easily support multiple restaurant branches under a single landlord account with dynamic role assignment.
            </p>
          </div>

          {/* Feature 8 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F8] group-hover:bg-[#C6FF2E] flex items-center justify-center text-[#111111] mb-6 transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-[#111111] mb-2">Inventory Management</h3>
            <p className="text-[#666666] text-xs leading-relaxed">
              Track ingredient stocks, trigger low inventory alerts, and automatically update item availability across digital menus.
            </p>
          </div>

          {/* Feature 9 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-[#F8F8F8] group-hover:bg-[#C6FF2E] flex items-center justify-center text-[#111111] mb-6 transition-colors">
              <Gift className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-[#111111] mb-2">Loyalty & Promotions</h3>
            <p className="text-[#666666] text-xs leading-relaxed">
              Launch customer loyalty points programs, create custom promo coupon codes, and run happy-hour discounts dynamically.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
