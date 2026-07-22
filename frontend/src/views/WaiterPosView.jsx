import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { realTimeSync } from '../utils/socket';
import { API_URL } from '../utils/config';
import { formatCurrency, formatOrderId } from '../utils/formatters';
import {
  UtensilsCrossed, LogOut, CheckCircle, Clock, ShoppingBag, Plus, Minus,
  Trash2, ArrowLeft, Search, UserCheck, ShieldAlert, Sparkles, Check, ChevronRight
} from 'lucide-react';

const BACKEND_URL = API_URL;

export default function WaiterPosView() {
  const { user, logout } = useAuth();
  const slug = user?.restaurantSlug || localStorage.getItem('ordering_restaurant') || 'cheezious';

  // Navigation state: 'grid' (Table Dashboard) | 'pos' (Ordering Interface)
  const [viewMode, setViewMode] = useState('grid');
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeSession, setActiveSession] = useState(null);

  // Table Data & Sessions State
  const [tableCount, setTableCount] = useState(12);
  const [activeSessions, setActiveSessions] = useState([]);
  const [tableOrdersMap, setTableOrdersMap] = useState({});
  const [startSessionModalTable, setStartSessionModalTable] = useState(null);
  const [startingSession, setStartingSession] = useState(false);

  // Menu & Cart State
  const [menuItems, setMenuItems] = useState([]);
  const [category, setCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]); // [{ id, name, price, quantity, size }]
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // 1. Initial Load: Fetch Restaurant Settings, Menu, Table Sessions, & Active Orders
  useEffect(() => {
    fetchRestaurantSettings();
    fetchMenu();
    fetchTableSessions();
    fetchActiveOrders();

    // Register WebSocket listener
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
      if (data.success && data.data) {
        if (data.data.table_count) setTableCount(data.data.table_count);
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
      const res = await fetch(`${BACKEND_URL}/api/v1/waiter/sessions/active?restaurant=${slug}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setActiveSessions(data.data);
      }
    } catch (e) {}
  };

  const fetchActiveOrders = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders/active?restaurant=${slug}`);
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

  // 2. Start Serving a Table (Session creation)
  const handleConfirmStartSession = async () => {
    if (!startSessionModalTable) return;
    setStartingSession(true);

    try {
      const token = localStorage.getItem('staff_token') || localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/api/v1/waiter/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tableId: startSessionModalTable,
          restaurantSlug: slug
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Started serving Table ${startSessionModalTable}`);
        setActiveSession(data.data);
        setSelectedTable(startSessionModalTable);
        setStartSessionModalTable(null);
        await fetchTableSessions();
        setViewMode('pos');
      } else {
        toast.error(data.message || 'Could not start waiter session.');
      }
    } catch (e) {
      toast.error('Network error starting session.');
    }
    setStartingSession(false);
  };

  // 3. Open POS for existing table
  const handleOpenTablePos = (tableNum, session, order) => {
    setSelectedTable(tableNum);
    setActiveSession(session || null);
    setCart([]);
    setOrderNotes('');
    setViewMode('pos');
  };

  // Cart operations for POS view
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
    toast.success(`Added ${itemTitle} to cart`);
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

  // Calculate Cart Totals
  const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const tax = subtotal * 0.08;
  const serviceCharge = subtotal * 0.05;
  const grandTotal = subtotal + tax + serviceCharge;

  // 4. Submit Order to Kitchen & Seller POS
  const handleSubmitWaiterOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Add items to submit order.');
      return;
    }
    setSubmittingOrder(true);

    const token = localStorage.getItem('staff_token') || localStorage.getItem('token');
    const orderPayload = {
      restaurantSlug: slug,
      tableNumber: String(selectedTable),
      table: String(selectedTable),
      order_source: 'waiter',
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Order #${data.data?.order_number || 'Sent'} submitted to Kitchen!`);
        setCart([]);
        setOrderNotes('');
        await fetchActiveOrders();
        setViewMode('grid');
      } else {
        toast.error(data.message || 'Failed to place waiter order.');
      }
    } catch (e) {
      toast.error('Network error submitting order.');
    }
    setSubmittingOrder(false);
  };

  // Unique Categories
  const categories = ['all', ...new Set(menuItems.map((m) => (m.category || 'mains').toLowerCase()))];
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCat = category === 'all' || (item.category || 'mains').toLowerCase() === category;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* ── HEADER BAR ───────────────────────────────────────────── */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 sticky top-0 z-30 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 font-black">
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-wide text-white capitalize">{slug} Waiter POS</h1>
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                Waiter Terminal
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Staff: <strong className="text-slate-200">{user?.displayName || user?.employeeCode || 'Waiter'}</strong> • {activeSessions.length} Active Tables
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {viewMode === 'pos' && (
            <button
              onClick={() => setViewMode('grid')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-700"
            >
              <ArrowLeft size={16} /> Table Dashboard
            </button>
          )}
          <button
            onClick={logout}
            className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <LogOut size={15} /> Exit
          </button>
        </div>
      </header>

      {/* ── VIEW MODE 1: TABLE DASHBOARD GRID ────────────────────────────── */}
      {viewMode === 'grid' && (
        <main className="max-w-7xl mx-auto p-6 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Floor Table Status Grid
              </h2>
              <p className="text-slate-400 text-xs mt-1">Select a table to start serving or take manual orders</p>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Served by Waiter
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Active Order
              </span>
            </div>
          </div>

          {/* Grid of Tables 1..N */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: tableCount }, (_, i) => i + 1).map((num) => {
              const strNum = String(num);
              const session = activeSessions.find((s) => String(s.table_id) === strNum);
              const order = tableOrdersMap[strNum];
              const isOccupiedByWaiter = !!session;
              const isOccupiedByOrder = !!order;

              let cardBg = 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/50';
              let badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
              let badgeText = 'Available';

              if (isOccupiedByWaiter) {
                cardBg = 'bg-amber-950/30 border-amber-500/40 hover:border-amber-400';
                badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                badgeText = session.waiter_name || 'Waiter Session';
              } else if (isOccupiedByOrder) {
                cardBg = 'bg-blue-950/30 border-blue-500/40 hover:border-blue-400';
                badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
                badgeText = order.status || 'Active Order';
              }

              return (
                <div
                  key={num}
                  onClick={() => {
                    if (isOccupiedByWaiter || isOccupiedByOrder) {
                      handleOpenTablePos(num, session, order);
                    } else {
                      setStartSessionModalTable(num);
                    }
                  }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-44 shadow-lg group hover:scale-[1.02] ${cardBg}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-slate-500 uppercase tracking-widest">TBL #{num}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${badgeColor}`}>
                        {badgeText}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white group-hover:text-amber-400 transition-colors">
                      Table {num}
                    </h3>
                  </div>

                  {order && (
                    <div className="text-xs text-slate-400 border-t border-slate-800/80 pt-2 flex justify-between items-center">
                      <span>Order {order.order_number || formatOrderId(order.id)}</span>
                      <span className="font-bold text-amber-400 font-mono">Rs {(order.billing?.total || 0).toFixed(0)}</span>
                    </div>
                  )}

                  {!isOccupiedByWaiter && !isOccupiedByOrder && (
                    <div className="text-xs text-emerald-400/80 flex items-center gap-1 font-semibold">
                      <Plus size={14} /> Start Serving
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* ── START SESSION MODAL ────────────────────────────────────────── */}
      {startSessionModalTable && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-2">Start Serving Table {startSessionModalTable}?</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              This will assign <strong className="text-white">Table {startSessionModalTable}</strong> to your active waiter shift and open the tablet POS ordering interface.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStartSessionModalTable(null)}
                disabled={startingSession}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStartSession}
                disabled={startingSession}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
              >
                {startingSession ? 'Initializing…' : 'Yes, Start Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW MODE 2: TABLET POS ORDERING SCREEN ─────────────────────── */}
      {viewMode === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[calc(100vh-73px)]">
          {/* LEFT 8 COLUMNS: MENU GRID & CATEGORIES */}
          <div className="lg:col-span-8 p-6 border-r border-slate-800 flex flex-col justify-between">
            <div>
              {/* POS Top Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    Table {selectedTable} <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-lg font-mono">Waiter POS</span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">Select items to build customer order</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                  <input
                    type="text"
                    placeholder="Search menu items…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white text-xs pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all ${
                      category === cat
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Menu Item Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {filteredMenuItems.map((item) => {
                  const hasSizes = Array.isArray(item.sizes) && item.sizes.length > 0;

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900 border border-slate-800/90 rounded-2xl p-3 flex flex-col justify-between hover:border-amber-500/40 transition-all group"
                    >
                      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-800 mb-3 relative">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';
                          }}
                        />
                      </div>
                      <h4 className="font-bold text-xs text-white line-clamp-1 mb-1">{item.name}</h4>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-mono text-xs font-extrabold text-amber-400">Rs {item.price}</span>
                        {!hasSizes ? (
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all active:scale-95"
                          >
                            <Plus size={16} />
                          </button>
                        ) : (
                          <div className="flex gap-1">
                            {item.sizes.map((sz) => (
                              <button
                                key={sz.name}
                                onClick={() => handleAddToCart(item, sz)}
                                className="px-2 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-[10px] font-bold text-slate-300 rounded-md border border-slate-700 transition-all"
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
            </div>
          </div>

          {/* RIGHT 4 COLUMNS: LIVE CART & SUBMIT ORDER */}
          <div className="lg:col-span-4 bg-slate-900/60 p-6 flex flex-col justify-between border-l border-slate-800">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
                <h3 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag size={18} className="text-amber-400" /> Current Order Cart
                </h3>
                <span className="text-xs font-mono font-bold text-slate-400">{cart.length} unique items</span>
              </div>

              {/* Cart List */}
              <div className="space-y-3 max-h-[calc(100vh-420px)] overflow-y-auto pr-1 mb-4">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl p-4">
                    <p className="text-xs">Cart is empty. Tap menu items to build order.</p>
                  </div>
                ) : (
                  cart.map((i) => (
                    <div key={i.cartId} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <h5 className="font-bold text-xs text-white truncate">{i.name}</h5>
                        <span className="font-mono text-[11px] text-slate-400">Rs {i.price} × {i.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleUpdateQty(i.cartId, -1)}
                          className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-white rounded-md flex items-center justify-center font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-bold text-white w-4 text-center">{i.quantity}</span>
                        <button
                          onClick={() => handleUpdateQty(i.cartId, 1)}
                          className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-white rounded-md flex items-center justify-center font-bold text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Special Notes */}
              <div className="mb-4">
                <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Kitchen Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Less spicy, extra sauce…"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white text-xs p-2.5 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Totals & Submit */}
            <div className="border-t border-slate-800 pt-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>Subtotal</span>
                <span>Rs {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>Tax (8%) & Service (5%)</span>
                <span>Rs {(tax + serviceCharge).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                <span>Grand Total</span>
                <span className="text-amber-400 font-mono">Rs {grandTotal.toFixed(2)}</span>
              </div>

              <button
                onClick={handleSubmitWaiterOrder}
                disabled={submittingOrder || cart.length === 0}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-98 text-slate-950 font-black text-sm rounded-xl shadow-xl shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingOrder ? 'Submitting Order…' : 'Submit Order to Kitchen 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
