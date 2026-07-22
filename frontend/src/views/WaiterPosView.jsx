import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { realTimeSync } from '../utils/socket';
import { API_URL } from '../utils/config';
import { formatCurrency, formatOrderId } from '../utils/formatters';
import {
  UtensilsCrossed, LogOut, CheckCircle, Clock, ShoppingBag, Plus, Minus,
  Trash2, Search, UserCheck, ShieldAlert, Sparkles, Check, ChevronRight, Layers, Table
} from 'lucide-react';

const BACKEND_URL = API_URL;

export default function WaiterPosView() {
  const { user, logout, token, authHeaders } = useAuth();
  const slug = user?.restaurantSlug || localStorage.getItem('ordering_restaurant') || 'cheezious';

  // Table Selection & POS state (default to Table 1 so menu is visible immediately)
  const [selectedTable, setSelectedTable] = useState('1');
  const [activeSession, setActiveSession] = useState(null);

  // Table & Orders State
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

  // Helper for auth headers
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

  // Handle Table Selection Dropdown Change
  const handleTableChange = (newTableNum) => {
    setSelectedTable(newTableNum);
    setCart([]);
    setOrderNotes('');
    const session = activeSessions.find((s) => String(s.table_id) === String(newTableNum));
    setActiveSession(session || null);
  };

  // Cart Operations
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

  // Calculate Cart Totals
  const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const tax = subtotal * 0.08;
  const serviceCharge = subtotal * 0.05;
  const grandTotal = subtotal + tax + serviceCharge;

  // Submit Order to Kitchen & Seller POS
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
        toast.success(`Order #${data.data?.order_number || 'Sent'} submitted to Kitchen for Table ${selectedTable}!`);
        setCart([]);
        setOrderNotes('');
        await fetchActiveOrders();
        await fetchTableSessions();
      } else {
        toast.error(data.message || 'Failed to place waiter order.');
      }
    } catch (e) {
      toast.error('Network error submitting order.');
    }
    setSubmittingOrder(false);
  };

  // Unique Categories & Filters
  const categories = ['all', ...new Set(menuItems.map((m) => (m.category || 'mains').toLowerCase()))];
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCat = category === 'all' || (item.category || 'mains').toLowerCase() === category;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const currentTableOrder = tableOrdersMap[String(selectedTable)];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* ── TOP HEADER BAR WITH TABLE DROPDOWN ───────────────────────────────────── */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-3.5 sticky top-0 z-30 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 font-black shrink-0">
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-wide text-white capitalize">{slug}</h1>
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                Waiter POS
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Staff: <strong className="text-slate-200">{user?.displayName || user?.employeeCode || 'Waiter'}</strong>
            </p>
          </div>
        </div>

        {/* ── TABLE DROPDOWN SELECTOR ── */}
        <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/30 px-3 py-1.5 rounded-2xl shadow-sm">
          <Table size={16} className="text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider hidden sm:inline">Target Table:</span>
          <select
            value={selectedTable}
            onChange={(e) => handleTableChange(e.target.value)}
            className="bg-transparent text-amber-400 font-extrabold text-sm focus:outline-none cursor-pointer pr-2"
          >
            {Array.from({ length: tableCount }, (_, i) => i + 1).map((num) => {
              const strNum = String(num);
              const hasOrder = !!tableOrdersMap[strNum];
              const hasSession = activeSessions.some((s) => String(s.table_id) === strNum);
              let tag = '';
              if (hasOrder) tag = ' 🔴 (Active Order)';
              else if (hasSession) tag = ' 🟠 (Waiter Serving)';

              return (
                <option key={num} value={num} className="bg-slate-900 text-white font-medium">
                  Table {num}{tag}
                </option>
              );
            })}
          </select>
        </div>

        <button
          onClick={logout}
          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <LogOut size={14} /> Exit
        </button>
      </header>

      {/* ── POS ORDERING VIEW (MENU & CART) ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[calc(100vh-68px)]">
        {/* LEFT 8 COLUMNS: MENU SEARCH & PRODUCTS GRID */}
        <div className="lg:col-span-8 p-4 sm:p-6 border-r border-slate-800 flex flex-col justify-between">
          <div>
            {/* Table Info & Active Status Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  Table {selectedTable} Menu Selection
                </h2>
                {currentTableOrder ? (
                  <p className="text-amber-400 text-xs mt-1 font-semibold flex items-center gap-1">
                    <Clock size={13} /> Active Order #{currentTableOrder.order_number || formatOrderId(currentTableOrder.id)} ({currentTableOrder.status})
                  </p>
                ) : (
                  <p className="text-emerald-400 text-xs mt-1 font-semibold flex items-center gap-1">
                    <CheckCircle size={13} /> Ready for new order
                  </p>
                )}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={15} />
                <input
                  type="text"
                  placeholder="Search item name…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all ${
                    category === cat
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-h-[calc(100vh-310px)] overflow-y-auto pr-1">
              {filteredMenuItems.map((item) => {
                const hasSizes = Array.isArray(item.sizes) && item.sizes.length > 0;

                return (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800/90 rounded-2xl p-3 flex flex-col justify-between hover:border-amber-500/40 transition-all group"
                  >
                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-800 mb-2.5 relative">
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
                          className="p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all active:scale-95 shadow-sm"
                        >
                          <Plus size={15} />
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

        {/* RIGHT 4 COLUMNS: SHOPPING CART & SUBMIT ORDER */}
        <div className="lg:col-span-4 bg-slate-900/60 p-4 sm:p-6 flex flex-col justify-between border-l border-slate-800">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag size={18} className="text-amber-400" /> Table {selectedTable} Order
              </h3>
              <span className="text-xs font-mono font-bold text-slate-400">{cart.length} items</span>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-[calc(100vh-430px)] overflow-y-auto pr-1 mb-4">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl p-4">
                  <p className="text-xs">Cart is empty for Table {selectedTable}. Tap menu items to build order.</p>
                </div>
              ) : (
                cart.map((i) => (
                  <div key={i.cartId} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2 shadow-xs">
                    <div className="truncate">
                      <h5 className="font-bold text-xs text-white truncate">{i.name}</h5>
                      <span className="font-mono text-[11px] text-slate-400">Rs {i.price} × {i.quantity}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleUpdateQty(i.cartId, -1)}
                        className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-white rounded-md flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs font-bold text-white w-4 text-center">{i.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(i.cartId, 1)}
                        className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-white rounded-md flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Order Special Notes */}
            <div className="mb-4">
              <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">Kitchen Notes / Instructions</label>
              <textarea
                rows={2}
                placeholder="e.g. Extra spicy, no onions…"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs p-2.5 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Cart Totals & Place Order Button */}
          <div className="border-t border-slate-800 pt-3 space-y-2">
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
              className="w-full mt-3 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-98 text-slate-950 font-black text-sm rounded-xl shadow-xl shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {submittingOrder ? 'Submitting Order…' : `Submit Order for Table ${selectedTable} 🚀`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
