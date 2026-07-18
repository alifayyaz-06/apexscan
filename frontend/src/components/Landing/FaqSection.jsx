import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FaqSection() {
  const [faqOpen, setFaqOpen] = useState({
    0: true,
    1: false,
    2: false,
    3: false,
    4: false
  });

  const toggleFaq = (index) => {
    setFaqOpen(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <section id="faq" className="reveal-on-scroll bg-[#F8F8F8] border-t border-[#ECECEC] py-20 lg:py-32">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16 max-w-xl mx-auto">
          <span className="text-[10px] font-extrabold text-[#666666] uppercase tracking-wider block">SUPPORT FAQ</span>
          <h2 className="text-3xl lg:text-[48px] font-extrabold text-[#111111] tracking-tight leading-none mt-2">Got questions?</h2>
          <p className="text-sm text-[#666666] mt-4">Here are answers to the most common questions regarding our SaaS system setup.</p>
        </div>

        <div className="space-y-4 max-w-2xl mx-auto">
          {/* Question 1 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl overflow-hidden transition-all">
            <button 
              onClick={() => toggleFaq(0)}
              className="w-full px-6 py-4 flex justify-between items-center text-left font-extrabold text-[#111111] text-sm"
            >
              <span>Does the customer need to install an app to scan the QR menu?</span>
              <ChevronDown className={`w-4 h-4 text-[#666666] transition-transform ${faqOpen[0] ? 'rotate-180' : ''}`} />
            </button>
            {faqOpen[0] && (
              <div className="px-6 pb-5 text-xs text-[#666666] leading-relaxed border-t border-[#F8F8F8] pt-3">
                No installation is required. The customer simply opens their phone's native camera, scans the table QR stand, and a mobile-friendly browser view pops up immediately.
              </div>
            )}
          </div>

          {/* Question 2 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl overflow-hidden transition-all">
            <button 
              onClick={() => toggleFaq(1)}
              className="w-full px-6 py-4 flex justify-between items-center text-left font-extrabold text-[#111111] text-sm"
            >
              <span>Can I manage multiple branches under a single landlord account?</span>
              <ChevronDown className={`w-4 h-4 text-[#666666] transition-transform ${faqOpen[1] ? 'rotate-180' : ''}`} />
            </button>
            {faqOpen[1] && (
              <div className="px-6 pb-5 text-xs text-[#666666] leading-relaxed border-t border-[#F8F8F8] pt-3">
                Yes. Apex Scan supports multi-tenant operations, allowing you to register multiple branches, configure custom menus for each, and track individual branch sales reports.
              </div>
            )}
          </div>

          {/* Question 3 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl overflow-hidden transition-all">
            <button 
              onClick={() => toggleFaq(2)}
              className="w-full px-6 py-4 flex justify-between items-center text-left font-extrabold text-[#111111] text-sm"
            >
              <span>Is payment gateway setup secure?</span>
              <ChevronDown className={`w-4 h-4 text-[#666666] transition-transform ${faqOpen[2] ? 'rotate-180' : ''}`} />
            </button>
            {faqOpen[2] && (
              <div className="px-6 pb-5 text-xs text-[#666666] leading-relaxed border-t border-[#F8F8F8] pt-3">
                Absolutely. All transactions are securely routed, and card checkouts are encrypted under industry standard compliance. Cash-on-table operations are also fully supported.
              </div>
            )}
          </div>

          {/* Question 4 */}
          <div className="bg-white border border-[#ECECEC] rounded-2xl overflow-hidden transition-all">
            <button 
              onClick={() => toggleFaq(3)}
              className="w-full px-6 py-4 flex justify-between items-center text-left font-extrabold text-[#111111] text-sm"
            >
              <span>What happens when an item runs out of stock in the kitchen?</span>
              <ChevronDown className={`w-4 h-4 text-[#666666] transition-transform ${faqOpen[3] ? 'rotate-180' : ''}`} />
            </button>
            {faqOpen[3] && (
              <div className="px-6 pb-5 text-xs text-[#666666] leading-relaxed border-t border-[#F8F8F8] pt-3">
                Chefs or managers can flag items as "out of stock" directly in the dashboard console. This immediately disables the item on all table QR menus across that branch.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
