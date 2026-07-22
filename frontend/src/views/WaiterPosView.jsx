import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { realTimeSync } from '../utils/socket';
import { API_URL } from '../utils/config';
import { formatCurrency, formatOrderId } from '../utils/formatters';
import {
  UtensilsCrossed, LogOut, CheckCircle, Clock, ShoppingBag, Plus, Minus,
  Trash2, ArrowLeft, ArrowRight, Table as TableIcon, X, Search, ChevronRight
} from 'lucide-react';

const BACKEND_URL = API_URL;

// Design tokens matching CustomerView & SaaS design system
const INK = "#171512";
const MUTED = "#8A8580";
const LINE = "#EBE7E0";
const WINE = "#7A2331";
const SERIF = { fontFamily: "'Fraunces', ui-serif, Georgia, serif" };
const SANS = { fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" };

function FontImport() {
  return (
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');`}</style>
  );
}

export default function WaiterPosView() {
  const { user, logout, token, authHeaders } = useAuth();
  const slug = user?.restaurantSlug || localStorage.getItem('ordering_restaurant') || 'cheezious';

  // Flow State
  const [selectedTable, setSelectedTable] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  // Data State
  const [tableCount, setTableCount] = useState(12);
  const [activeSessions, setActiveSessions] = useState([]);
  const [tableOrdersMap, setTableOrdersMap] = useState({});

  // Menu & Cart State
  const [menuItems, setMenuItems] = useState([]);
  const [category, setCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]); // [{ cartId, id, name, price, quantity }]
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Auth headers helper
  const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    const authH = authHeaders ? authHeaders() : {};
    if (authH.Authorization) headers.Authorization = authH.Authorization;
    else if (token) headers.Authorization = `Bearer ${token}`;
    else {
      const storedToken = localStorage.getItem('staff_token') || localStorage.getItem('token');
      if (storedToken) headers.Authorization = `Bearer ${storedToken}`;
    }
    return headers;
  };

  // Initial Load & Realtime WebSockets
  useEffect(() => {
    fetchRestaurantSettings();
    fetchMenu();
    fetchTableSessions();
    fetchActiveOrders();

    realTimeSync.registerRestaurant(slug, 'waiter');
    const cleanupSocket = realTimeSync.onOrderUpdate(() => {
      fetchTableSessions();
      fetchActiveOrders();
    });

    return () => cleanupSocket();
  }, [slug]);

  const fetchRestaurantSettings = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/restaurants/public/${slug}`);
      const data = await res.json();
      if (data.success && data.data && data.data.table_count) {
        setTableCount(data.data.table_count);
      }
    } catch (e) {}
  };

  const fetchMenu = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/menu/public/${slug}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMenuItems(data.data);
      }
    } catch (e) {}
  };

  const fetchTableSessions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/waiter/sessions/active?restaurant=${slug}`, {
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setActiveSessions(data.data);
      }
    } catch (e) {}
  };

  const fetchActiveOrders = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders/active?restaurant=${slug}`, {
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const map = {};
        data.data.forEach((o) => {
          const tblNum = (o.table_name || o.table || '').toString().replace(/[^0-9]/g, '');
          if (tblNum) map[tblNum] = o;
        });
        setTableOrdersMap(map);
      }
    } catch (e) {}
  };

  // STEP 1 -> STEP 2: When Table is selected & "Open Menu" is clicked
  const handleOpenMenuForTable = (tableNum) => {
    if (!tableNum) {
      toast.error('Please select a table number first');
      return;
    }
    setSelectedTable(tableNum);
    setCart([]);
    setOrderNotes('');
    setIsCartModalOpen(false);
    const session = activeSessions.find((s) => String(s.table_id) === String(tableNum));
    setActiveSession(session || null);
    setIsMenuOpen(true);
  };

  // Cart operations
  const handleAddToCart = (item, selectedSize = null) => {
    const itemPrice = selectedSize ? parseFloat(selectedSize.price) : item.price;
    const itemTitle = selectedSize ? `${item.name} (${selectedSize.name})` : item.name;
    const cartId = selectedSize ? `${item.id}_${selectedSize.name}` : `${item.id}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.cartId === cartId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          cartId,
          id: String(item.id),
          menu_item_id: String(item.id),
          name: itemTitle,
          price: itemPrice,
          quantity: 1,
          image: item.image
        }
      ];
    });
    toast.success(`Added ${itemTitle}`);
  };

  const handleUpdateQty = (cartId, delta) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.cartId === cartId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean);
    });
  };

  // Totals & item count
  const cartItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const tax = subtotal * 0.08;
  const serviceCharge = subtotal * 0.05;
  const grandTotal = subtotal + tax + serviceCharge;

  // Submit Order (First sends to Seller POS in real-time as pending)
  const handleSubmitWaiterOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Add items to submit order.');
      return;
    }
    setSubmittingOrder(true);

    const orderPayload = {
      restaurantSlug: slug,
      tableNumber: String(selectedTable),
      table: String(selectedTable),
      order_source: 'waiter',
      status: 'pending', // Starts as pending for Seller POS review
      waiter_id: user?.id || user?.staffId,
      session_id: activeSession?.id,
      items: cart.map((i) => ({
        id: String(i.id),
        menu_item_id: String(i.id),
        name: i.name,
        price: i.price,
        quantity: i.quantity
      })),
      total_amount: grandTotal,
      billing: {
        notes: orderNotes,
        subtotal,
        tax,
        serviceCharge,
        total: grandTotal,
        waiterName: user?.displayName || 'Waiter'
      }
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Order #${data.data?.order_number || 'Sent'} sent to Seller POS!`);
        setCart([]);
        setOrderNotes('');
        setIsCartModalOpen(false);
        await fetchActiveOrders();
        await fetchTableSessions();
        setIsMenuOpen(false);
      } else {
        toast.error(data.message || 'Failed to place waiter order.');
      }
    } catch (e) {
      toast.error('Network error submitting order.');
    }
    setSubmittingOrder(false);
  };

  // Categories & Filtering
  const categories = ['all', ...new Set(menuItems.map((m) => (m.category || 'mains').toLowerCase()))];
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCat = category === 'all' || (item.category || 'mains').toLowerCase() === category;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const currentTableOrder = tableOrdersMap[String(selectedTable)];

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#171512] pb-24" style={SANS}>
      <FontImport />

      {/* ── STICKY TOP HEADER BAR ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#EBE7E0] px-4 py-3.5 sticky top-0 z-30 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#171512] flex items-center justify-center text-white font-bold">
            <UtensilsCrossed size={18} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-[#171512] capitalize" style={SERIF}>
              {slug} <span className="text-[10px] font-sans text-[#8A8580] uppercase tracking-wider font-semibold ml-1">Waiter Terminal</span>
            </h1>
            <p className="text-[11px] text-[#8A8580]">
              Staff: <strong className="text-[#171512] font-semibold">{user?.displayName || user?.employeeCode || 'Waiter'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isMenuOpen && (
            <button
              onClick={() => setIsMenuOpen(false)}
              className="px-3 py-1.5 bg-white border border-[#EBE7E0] hover:bg-zinc-50 text-[#171512] text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <ArrowLeft size={14} /> Table {selectedTable}
            </button>
          )}
          <button
            onClick={logout}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
          >
            <LogOut size={13} /> Exit
          </button>
        </div>
      </header>

      {/* ── STEP 1: TABLE SELECTION SCREEN (MOBILE & TABLET OPTIMIZED) ─────────── */}
      {!isMenuOpen ? (
        <main className="max-w-md mx-auto px-4 py-8 sm:py-12">
          <div className="bg-white border border-[#EBE7E0] rounded-3xl p-6 sm:p-8 shadow-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#7A2331] border border-amber-200/60 mx-auto flex items-center justify-center mb-4">
              <TableIcon size={26} />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[#171512] mb-1.5" style={SERIF}>
              Select Table Number
            </h2>
            <p className="text-xs text-[#8A8580] max-w-xs mx-auto mb-6">
              Pick a table to open its menu and add items for your customer.
            </p>

            {/* TABLE DROPDOWN SELECTOR */}
            <div className="mb-6 text-left">
              <label className="text-[10px] font-bold text-[#8A8580] uppercase tracking-wider block mb-1.5">
                Target Table Number
              </label>
              <div className="relative">
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full bg-[#F9F8F6] border border-[#EBE7E0] text-[#171512] text-base font-semibold py-3.5 px-4 rounded-2xl focus:outline-none focus:border-[#7A2331] transition-colors cursor-pointer appearance-none"
                  style={SERIF}
                >
                  <option value="">-- Choose a Table Number --</option>
                  {Array.from({ length: tableCount }, (_, i) => i + 1).map((num) => {
                    const strNum = String(num);
                    const hasOrder = !!tableOrdersMap[strNum];
                    const hasSession = activeSessions.some((s) => String(s.table_id) === strNum);
                    let tag = '';
                    if (hasOrder) tag = ' 🔴 (Active Order)';
                    else if (hasSession) tag = ' 🟠 (Waiter Serving)';

                    return (
                      <option key={num} value={num} className="bg-white text-[#171512]">
                        Table {num}{tag}
                      </option>
                    );
                  })}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8A8580] text-xs">
                  ▼
                </div>
              </div>
            </div>

            {/* OPEN MENU BUTTON */}
            <button
              onClick={() => handleOpenMenuForTable(selectedTable)}
              disabled={!selectedTable}
              className="w-full py-4 bg-[#7A2331] hover:bg-[#631c27] active:scale-98 text-white font-bold text-sm rounded-2xl shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open Menu for Table {selectedTable || '…'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </main>
      ) : (
        /* ── STEP 2: MOBILE/TABLET RESPONSIVE MENU PAGE FOR SELECTED TABLE ─────────── */
        <main className="max-w-2xl mx-auto px-4 py-4 sm:py-6 space-y-4">
          
          {/* Header Info Banner for Selected Table */}
          <div className="bg-white border border-[#EBE7E0] p-4 rounded-3xl shadow-xs flex justify-between items-center gap-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8A8580] block">
                Serving Table
              </span>
              <h2 className="text-lg font-bold text-[#171512]" style={SERIF}>
                Table {selectedTable} Menu
              </h2>
              {currentTableOrder && (
                <p className="text-[11px] font-semibold text-amber-700 mt-0.5 flex items-center gap-1">
                  <Clock size={12} /> Active Order #{currentTableOrder.order_number || formatOrderId(currentTableOrder.id)} ({currentTableOrder.status})
                </p>
              )}
            </div>

            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-xs text-[#7A2331] font-bold border border-amber-200 bg-amber-50/50 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors"
            >
              Change Table
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-[#8A8580]" size={16} />
            <input
              type="text"
              placeholder="Search menu items…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-[#EBE7E0] text-[#171512] text-xs pl-9 pr-4 py-2.5 rounded-2xl focus:outline-none focus:border-[#7A2331] transition-colors shadow-xs"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all cursor-pointer ${
                  category === cat
                    ? 'bg-[#171512] text-white shadow-xs'
                    : 'bg-white text-[#8A8580] border border-[#EBE7E0] hover:text-[#171512]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid (Mobile/Tablet Touch Cards) */}
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
            {filteredMenuItems.map((item) => {
              const hasSizes = Array.isArray(item.sizes) && item.sizes.length > 0;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-[#EBE7E0] rounded-2xl p-3 flex flex-col justify-between hover:shadow-md transition-all group"
                >
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#F4F2EE] mb-2.5 relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500 ease-out"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';
                      }}
                    />
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm leading-snug text-[#171512] line-clamp-1 mb-0.5" style={SERIF}>
                      {item.name}
                    </h3>
                    <span className="text-xs italic" style={{ ...SERIF, color: WINE }}>
                      Rs {item.price.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    {!hasSizes ? (
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="w-full py-1.5 bg-[#171512] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <Plus size={14} /> Add
                      </button>
                    ) : (
                      <div className="flex gap-1">
                        {item.sizes.map((sz) => (
                          <button
                            key={sz.name}
                            onClick={() => handleAddToCart(item, sz)}
                            className="flex-1 py-1 bg-[#F9F8F6] hover:bg-[#171512] text-[#171512] hover:text-white text-[10px] font-semibold rounded-lg border border-[#EBE7E0] transition-all cursor-pointer"
                          >
                            {sz.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── BOTTOM FLOATING BASKET BUTTON (Triggers Cart Modal) ────────────────── */}
          {cartItemCount > 0 && (
            <div className="fixed bottom-5 inset-x-0 z-40 px-4 max-w-md mx-auto">
              <button
                onClick={() => setIsCartModalOpen(true)}
                className="w-full py-3.5 px-5 bg-[#7A2331] hover:bg-[#631c27] active:scale-98 text-white rounded-full shadow-2xl flex justify-between items-center transition-all cursor-pointer border border-rose-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">
                    {cartItemCount}
                  </div>
                  <span className="text-xs font-bold tracking-wide">View Basket / Checkout</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-bold text-sm">
                  <span>Rs {grandTotal.toFixed(2)}</span>
                  <ArrowRight size={16} />
                </div>
              </button>
            </div>
          )}

          {/* ── CART DRAWER MODAL OVERLAY ────────────────────────────────────────── */}
          {isCartModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-white text-[#171512] w-full max-w-md border border-[#EBE7E0] rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom">
                <div className="flex justify-between items-center pb-3 border-b border-[#EBE7E0] mb-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8A8580] block">
                      Table {selectedTable} Order Review
                    </span>
                    <h3 className="text-base font-bold text-[#171512]" style={SERIF}>
                      Cart Items ({cartItemCount})
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsCartModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-[#F9F8F6] border border-[#EBE7E0] flex items-center justify-center text-[#8A8580] hover:text-[#171512]"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-2.5 mb-4">
                  {cart.map((i) => (
                    <div key={i.cartId} className="bg-[#F9F8F6] border border-[#EBE7E0] rounded-xl p-3 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <h4 className="font-semibold text-xs text-[#171512] truncate" style={SERIF}>{i.name}</h4>
                        <span className="text-[11px] italic font-mono" style={{ ...SERIF, color: WINE }}>Rs {i.price.toFixed(2)} × {i.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleUpdateQty(i.cartId, -1)}
                          className="w-6 h-6 bg-white border border-[#EBE7E0] hover:bg-zinc-100 text-[#171512] rounded-md flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-bold text-[#171512] w-4 text-center">{i.quantity}</span>
                        <button
                          onClick={() => handleUpdateQty(i.cartId, 1)}
                          className="w-6 h-6 bg-white border border-[#EBE7E0] hover:bg-zinc-100 text-[#171512] rounded-md flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Instructions */}
                <div className="mb-4">
                  <label className="text-[10px] font-bold text-[#8A8580] block mb-1 uppercase tracking-wider">
                    Kitchen Instructions / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Extra spicy, no onions…"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full bg-[#F9F8F6] border border-[#EBE7E0] text-[#171512] text-xs p-2.5 rounded-xl focus:outline-none focus:border-[#7A2331] transition-colors"
                  />
                </div>

                {/* Totals */}
                <div className="border-t border-[#EBE7E0] pt-3 space-y-1.5 text-xs mb-4">
                  <div className="flex justify-between text-[#8A8580]">
                    <span>Subtotal</span>
                    <span className="font-mono">Rs {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#8A8580]">
                    <span>Tax (8%) & Service (5%)</span>
                    <span className="font-mono">Rs {(tax + serviceCharge).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#171512] pt-2 border-t border-[#EBE7E0]">
                    <span>Grand Total</span>
                    <span className="text-base italic font-mono" style={{ ...SERIF, color: WINE }}>
                      Rs {grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Submit Order */}
                <button
                  onClick={handleSubmitWaiterOrder}
                  disabled={submittingOrder || cart.length === 0}
                  className="w-full py-3.5 bg-[#7A2331] hover:bg-[#631c27] active:scale-98 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingOrder ? 'Submitting to Seller…' : `Submit Order for Table ${selectedTable} 🚀`}
                </button>
              </div>
            </div>
          )}

        </main>
      )}
    </div>
  );
}
