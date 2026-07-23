import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { realTimeSync } from '../utils/socket';
import { API_URL } from '../utils/config';
import { formatCurrency, formatOrderId } from '../utils/formatters';
import {
  UtensilsCrossed, LogOut, CheckCircle, Clock, ShoppingBag, Plus, Minus,
  ArrowLeft, ArrowRight, Table as TableIcon, X, Search, PlusCircle, Bell, AlertTriangle
} from 'lucide-react';

const BACKEND_URL = API_URL;

// Design tokens — matches seller screen (WaiterView) palette
const INK = "#171512";
const MUTED = "#8A8580";
const LINE = "#EBE7E0";
const WINE = "#7A2331";
const BG = "#F9F8F6";
const SERIF = { fontFamily: "'Roboto Condensed', sans-serif" };
const SANS = { fontFamily: "'Roboto Condensed', sans-serif" };

function FontImport() {
  return (
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:ital,wght@0,100..900;1,100..900&display=swap');`}</style>
  );
}

let audioCtx = null;
let oscillator1 = null;
let oscillator2 = null;
let gainNode = null;

function playLoudAlarm() {
  try {
    if (oscillator1 || oscillator2) return; // Already playing
    
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.connect(audioCtx.destination);
    
    oscillator1 = audioCtx.createOscillator();
    oscillator1.type = 'sawtooth';
    oscillator1.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator1.connect(gainNode);
    
    oscillator2 = audioCtx.createOscillator();
    oscillator2.type = 'square';
    oscillator2.frequency.setValueAtTime(885, audioCtx.currentTime);
    oscillator2.connect(gainNode);
    
    const modulateInterval = setInterval(() => {
      if (!audioCtx) {
        clearInterval(modulateInterval);
        return;
      }
      const now = audioCtx.currentTime;
      oscillator1.frequency.setValueAtTime(880, now);
      oscillator2.frequency.setValueAtTime(980, now + 0.1);
    }, 200);

    oscillator1.start();
    oscillator2.start();
    
    audioCtx.modulateInterval = modulateInterval;
  } catch (err) {
    console.error("Web Audio API failed to start alarm:", err);
  }
}

function stopLoudAlarm() {
  try {
    if (audioCtx) {
      if (audioCtx.modulateInterval) clearInterval(audioCtx.modulateInterval);
      if (oscillator1) {
        oscillator1.stop();
        oscillator1.disconnect();
      }
      if (oscillator2) {
        oscillator2.stop();
        oscillator2.disconnect();
      }
      if (gainNode) {
        gainNode.disconnect();
      }
      audioCtx.close();
    }
  } catch (err) {
    console.error("Failed to stop alarm:", err);
  } finally {
    audioCtx = null;
    oscillator1 = null;
    oscillator2 = null;
    gainNode = null;
  }
}

export default function WaiterPosView() {
  const { user, logout, token, authHeaders } = useAuth();
  const slug = user?.restaurantSlug || localStorage.getItem('ordering_restaurant') || 'cheezious';
  const waiterName = user?.displayName || user?.employeeCode || 'Waiter';

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
  const [cart, setCart] = useState([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Assistance Queue State
  const [assistanceRequests, setAssistanceRequests] = useState([]);

  // Auth headers
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

  // Initial Load & WebSocket
  useEffect(() => {
    fetchRestaurantSettings();
    fetchMenu();
    fetchTableSessions();
    fetchActiveOrders();
    fetchActiveCalls();

    realTimeSync.registerRestaurant(slug, 'waiter', user?.id || user?.staffId || user?.employeeCode);
    
    const cleanupSocket = realTimeSync.onOrderUpdate(() => {
      fetchTableSessions();
      fetchActiveOrders();
    });

    const cleanupCallWaiter = realTimeSync.on('CALL_WAITER', (data) => {
      if (data && data.call) {
        setAssistanceRequests(prev => {
          if (prev.some(c => c.id === data.call.id)) return prev;
          return [...prev, data.call];
        });
      }
    });

    // Auto-refresh/polling loop every 5 seconds
    const pollInterval = setInterval(() => {
      fetchTableSessions();
      fetchActiveOrders();
      fetchActiveCalls();
    }, 5000);

    return () => {
      cleanupSocket();
      cleanupCallWaiter();
      clearInterval(pollInterval);
      stopLoudAlarm();
    };
  }, [slug]);

  // Synchronize alarm and vibration with unacknowledged calls
  const unacknowledgedCall = assistanceRequests.find(r => r.status === 'waiting');

  useEffect(() => {
    let vibrateInterval = null;
    if (unacknowledgedCall) {
      playLoudAlarm();
      if (navigator.vibrate) {
        // Continuous vibration pattern
        navigator.vibrate([400, 200, 400, 200, 400]);
        vibrateInterval = setInterval(() => {
          navigator.vibrate([400, 200, 400, 200, 400]);
        }, 2000);
      }
    } else {
      stopLoudAlarm();
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
    }
    return () => {
      if (vibrateInterval) clearInterval(vibrateInterval);
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
    };
  }, [unacknowledgedCall]);

  const fetchRestaurantSettings = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/restaurants/public/${slug}`);
      const data = await res.json();
      if (data.success && data.data && data.data.table_count) setTableCount(data.data.table_count);
    } catch (e) {}
  };

  const fetchMenu = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/menu/public/${slug}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setMenuItems(data.data);
    } catch (e) {}
  };

  const fetchTableSessions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/waiter/sessions/active?restaurant=${slug}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setActiveSessions(data.data);
    } catch (e) {}
  };

  const fetchActiveCalls = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/waiter/calls/active?waiterId=${user?.id || user?.staffId}&restaurant=${slug}`, {
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAssistanceRequests(data.data);
      }
    } catch (e) {
      console.error("Error fetching active waiter calls:", e);
    }
  };

  const handleAcknowledgeCall = async (callId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/waiter/calls/${callId}/acknowledge?restaurant=${slug}`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        setAssistanceRequests(prev =>
          prev.map(c => c.id === callId ? { ...c, status: 'accepted' } : c)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissCall = async (callId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/waiter/calls/${callId}/dismiss?restaurant=${slug}`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        setAssistanceRequests(prev => prev.filter(c => c.id !== callId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders/active?restaurant=${slug}`, { headers: getHeaders() });
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

  // Open Menu for a selected table
  const handleOpenMenuForTable = (tableNum) => {
    if (!tableNum) { toast.error('Please select a table number first'); return; }
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
      return [...prev, { cartId, id: String(item.id), menu_item_id: String(item.id), name: itemTitle, price: itemPrice, quantity: 1, image: item.image }];
    });
    toast.success(`Added ${itemTitle}`);
  };

  const handleUpdateQty = (cartId, delta) => {
    setCart((prev) => prev.map((i) => {
      if (i.cartId === cartId) { const q = i.quantity + delta; return q > 0 ? { ...i, quantity: q } : null; }
      return i;
    }).filter(Boolean));
  };

  // Totals
  const cartItemCount = cart.reduce((a, i) => a + i.quantity, 0);
  const subtotal = cart.reduce((a, i) => a + i.price * i.quantity, 0);
  const tax = subtotal * 0.08;
  const serviceCharge = subtotal * 0.05;
  const grandTotal = subtotal + tax + serviceCharge;

  const currentTableOrder = tableOrdersMap[String(selectedTable)];

  // Submit NEW order or ADD items to existing order
  const handleSubmitWaiterOrder = async () => {
    if (cart.length === 0) { toast.error('Cart is empty.'); return; }
    setSubmittingOrder(true);

    try {
      if (currentTableOrder) {
        // ADD items to existing order via PUT /orders/:id
        const existingItems = currentTableOrder.items || [];
        const mergedItems = [...existingItems];
        cart.forEach((ci) => {
          const idx = mergedItems.findIndex((m) => m.id === ci.id && m.name === ci.name);
          if (idx >= 0) {
            mergedItems[idx] = { ...mergedItems[idx], quantity: mergedItems[idx].quantity + ci.quantity };
          } else {
            mergedItems.push({ id: ci.id, name: ci.name, price: ci.price, quantity: ci.quantity });
          }
        });

        const res = await fetch(`${BACKEND_URL}/api/v1/orders/${currentTableOrder.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ items: mergedItems })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          toast.success(`Added ${cartItemCount} item(s) to existing order for Table ${selectedTable}`);
          setCart([]); setOrderNotes(''); setIsCartModalOpen(false);
          await fetchActiveOrders();
          setIsMenuOpen(false);
        } else {
          toast.error(data.message || 'Failed to add items to order.');
        }
      } else {
        // CREATE new order via POST /orders
        const orderPayload = {
          restaurantSlug: slug,
          tableNumber: String(selectedTable),
          table: String(selectedTable),
          order_source: 'waiter',
          status: 'pending',
          waiter_id: user?.id || user?.staffId,
          session_id: activeSession?.id,
          items: cart.map((i) => ({ id: String(i.id), menu_item_id: String(i.id), name: i.name, price: i.price, quantity: i.quantity })),
          total_amount: grandTotal,
          billing: {
            notes: orderNotes,
            subtotal, tax, serviceCharge,
            total: grandTotal,
            order_source: 'waiter',
            waiterName: waiterName,
            waiter_id: user?.id || user?.staffId
          }
        };

        const res = await fetch(`${BACKEND_URL}/api/v1/orders`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(orderPayload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          toast.success(`Order #${data.data?.order_number || 'Sent'} sent to Seller POS!`);
          setCart([]); setOrderNotes(''); setIsCartModalOpen(false);
          await fetchActiveOrders(); await fetchTableSessions();
          setIsMenuOpen(false);
        } else {
          toast.error(data.message || 'Failed to place order.');
        }
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

  const renderAssistancePopup = () => {
    if (!unacknowledgedCall) return null;
    return (
      <div className="fixed inset-0 bg-[#7A2331]/40 backdrop-blur-md z-[999] flex items-center justify-center p-6">
        <div className="bg-white border border-[#EBE7E0] max-w-md w-full p-8 rounded-3xl shadow-2xl relative text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-rose-50 text-[#7A2331] border border-rose-200 mx-auto flex items-center justify-center animate-bounce">
            <Bell size={32} />
          </div>

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#7A2331]">
              Customer Needs Assistance
            </span>
            <h1 className="text-3xl font-bold text-[#171512] mt-1" style={SERIF}>
              {unacknowledgedCall.tableName}
            </h1>
            <p className="text-xs text-[#8A8580] mt-1.5 leading-relaxed">
              A customer at this table is calling for assistance. Please respond immediately.
            </p>
          </div>

          <div className="bg-[#F9F8F6] border border-[#EBE7E0] rounded-2xl p-4 text-left space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8A8580]">Restaurant Name:</span>
              <span className="font-bold text-[#171512] capitalize">{unacknowledgedCall.restaurantName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8A8580]">Request Time:</span>
              <span className="font-bold text-[#171512]">
                {new Date(unacknowledgedCall.requestTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleDismissCall(unacknowledgedCall.id)}
              className="flex-1 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-extrabold text-xs rounded-2xl transition-all cursor-pointer border border-[#EBE7E0]"
            >
              Dismiss
            </button>
            <button
              onClick={() => handleAcknowledgeCall(unacknowledgedCall.id)}
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all cursor-pointer"
            >
              Acknowledge
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#171512] pb-24" style={SANS}>
      <FontImport />

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#EBE7E0] px-4 py-3.5 sticky top-0 z-30 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#171512] flex items-center justify-center text-white font-bold">
            <UtensilsCrossed size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#171512] capitalize" style={SERIF}>
              {slug} <span className="text-[10px] font-sans text-[#8A8580] uppercase tracking-wider font-semibold ml-1">Waiter Terminal</span>
            </h1>
            <p className="text-[11px] text-[#8A8580]">
              Staff: <strong className="text-[#171512] font-semibold">{waiterName}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMenuOpen && (
            <button onClick={() => setIsMenuOpen(false)} className="px-3 py-1.5 bg-white border border-[#EBE7E0] hover:bg-zinc-50 text-[#171512] text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-xs">
              <ArrowLeft size={14} /> Tables
            </button>
          )}
          <button onClick={logout} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer">
            <LogOut size={13} /> Exit
          </button>
        </div>
      </header>

      {/* ── STEP 1: TABLE SELECTION (CENTERED) ────────────────── */}
      {!isMenuOpen ? (
        <main className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 py-8 space-y-6">
          
          {/* Active Assistance Requests List */}
          {assistanceRequests.length > 0 && (
            <div className="w-full max-w-sm bg-white border border-[#EBE7E0] rounded-3xl p-6 shadow-sm text-left">
              <h3 className="text-xs font-extrabold text-[#7A2331] uppercase tracking-wider mb-4 flex items-center gap-1.5" style={SERIF}>
                <Bell size={14} /> Active Assistance Requests ({assistanceRequests.length})
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {assistanceRequests.map((req) => (
                  <div key={req.id} className="flex justify-between items-center bg-[#F9F8F6] border border-[#EBE7E0] rounded-2xl p-3.5">
                    <div>
                      <div className="text-xs font-bold text-[#171512]" style={SERIF}>{req.tableName}</div>
                      <div className="text-[10px] text-[#8A8580] mt-0.5">
                        {new Date(req.requestTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div className={`inline-block text-[9px] font-extrabold uppercase mt-1.5 px-2 py-0.5 rounded-full ${
                        req.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60 animate-pulse'
                      }`}>
                        {req.status === 'accepted' ? 'Accepted' : 'Waiting'}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {req.status !== 'accepted' && (
                        <button
                          onClick={() => handleAcknowledgeCall(req.id)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-xl transition-all cursor-pointer"
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => handleDismissCall(req.id)}
                        className="px-2.5 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-extrabold text-[10px] rounded-xl transition-all cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-[#EBE7E0] rounded-3xl p-6 sm:p-8 shadow-sm text-center w-full max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#7A2331] border border-amber-200/60 mx-auto flex items-center justify-center mb-4">
              <TableIcon size={26} />
            </div>

            <h2 className="text-xl font-bold text-[#171512] mb-1.5" style={SERIF}>
              Select Table
            </h2>
            <p className="text-xs text-[#8A8580] max-w-xs mx-auto mb-6">
              Choose a table number to open the menu and add items.
            </p>

            {/* TABLE DROPDOWN */}
            <div className="mb-6 text-left">
              <label className="text-[10px] font-bold text-[#8A8580] uppercase tracking-wider block mb-1.5">Table Number</label>
              <div className="relative">
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full bg-[#F9F8F6] border border-[#EBE7E0] text-[#171512] text-base font-semibold py-3.5 px-4 rounded-2xl focus:outline-none focus:border-[#7A2331] transition-colors cursor-pointer appearance-none"
                  style={SERIF}
                >
                  <option value="">-- Choose Table --</option>
                  {Array.from({ length: tableCount }, (_, i) => i + 1).map((num) => {
                    const strNum = String(num);
                    const hasOrder = !!tableOrdersMap[strNum];
                    const hasSession = activeSessions.some((s) => String(s.table_id) === strNum);
                    let tag = '';
                    if (hasOrder) tag = ' (Active Order)';
                    else if (hasSession) tag = ' (Serving)';
                    return <option key={num} value={num} className="bg-white text-[#171512]">Table {num}{tag}</option>;
                  })}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8A8580] text-xs">▼</div>
              </div>
            </div>

            <button
              onClick={() => handleOpenMenuForTable(selectedTable)}
              disabled={!selectedTable || (user?.role === 'waiter' && !!tableOrdersMap[selectedTable])}
              className="w-full py-4 bg-[#7A2331] hover:bg-[#631c27] active:scale-98 text-white font-bold text-sm rounded-2xl shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {tableOrdersMap[selectedTable] ? 'Add Items to Existing Order' : 'Open Menu'}
              <ArrowRight size={16} />
            </button>

            {selectedTable && user?.role === 'waiter' && !!tableOrdersMap[selectedTable] && (
              <p className="mt-3 text-[11px] text-[#7A2331] font-bold leading-normal bg-red-50/50 border border-red-200/50 p-2.5 rounded-xl text-center flex items-center justify-center gap-1.5">
                <AlertTriangle size={12} className="shrink-0" /> Active order in progress. Waiters are not permitted to modify active orders. Only Cashier/Seller POS can modify.
              </p>
            )}
          </div>
        </main>
      ) : (
        /* ── STEP 2: MENU PAGE ───────────────────────────────────── */
        <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">

          {/* Active Order Banner (if table has existing order) */}
          {currentTableOrder && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Existing Order Active</span>
                <p className="text-sm font-bold text-[#171512]" style={SERIF}>
                  Order #{currentTableOrder.order_number || formatOrderId(currentTableOrder.id)} — {currentTableOrder.items?.length || 0} items
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Status: {currentTableOrder.status} | New items will be added to this order
                </p>
              </div>
              <PlusCircle size={24} className="text-amber-600 shrink-0" />
            </div>
          )}

          {/* Table Info Header */}
          <div className="bg-white border border-[#EBE7E0] p-4 rounded-3xl shadow-xs flex justify-between items-center gap-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8A8580] block">Table {selectedTable}</span>
              <h2 className="text-lg font-bold text-[#171512]" style={SERIF}>
                {currentTableOrder ? 'Add More Items' : 'Menu Selection'}
              </h2>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="text-xs text-[#7A2331] font-bold border border-amber-200 bg-amber-50/50 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors">
              Change Table
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-[#8A8580]" size={16} />
            <input type="text" placeholder="Search menu items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-[#EBE7E0] text-[#171512] text-xs pl-9 pr-4 py-2.5 rounded-2xl focus:outline-none focus:border-[#7A2331] transition-colors shadow-xs" />
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all cursor-pointer ${
                  category === cat ? 'bg-[#171512] text-white shadow-xs' : 'bg-white text-[#8A8580] border border-[#EBE7E0] hover:text-[#171512]'}`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            {filteredMenuItems.map((item) => {
              const hasSizes = Array.isArray(item.sizes) && item.sizes.length > 0;
              return (
                <div key={item.id} className="bg-white border border-[#EBE7E0] rounded-2xl p-3 flex flex-col justify-between hover:shadow-md transition-all group">
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#F4F2EE] mb-2.5 relative">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500 ease-out"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; }} />
                  </div>
                  <div>
                    <h3 className="text-xs leading-snug text-[#171512] line-clamp-1 mb-0.5" style={SERIF}>{item.name}</h3>
                    <span className="text-xs italic" style={{ ...SERIF, color: WINE }}>Rs {item.price.toFixed(2)}</span>
                  </div>
                  <div className="mt-2.5">
                    {!hasSizes ? (
                      <button onClick={() => handleAddToCart(item)} className="w-full py-1.5 bg-[#171512] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95">
                        <Plus size={14} /> Add
                      </button>
                    ) : (
                      <div className="flex gap-1">
                        {item.sizes.map((sz) => (
                          <button key={sz.name} onClick={() => handleAddToCart(item, sz)}
                            className="flex-1 py-1 bg-[#F9F8F6] hover:bg-[#171512] text-[#171512] hover:text-white text-[10px] font-semibold rounded-lg border border-[#EBE7E0] transition-all cursor-pointer">
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

          {/* ── FLOATING BASKET BUTTON ────────────────────────── */}
          {cartItemCount > 0 && (
            <div className="fixed bottom-5 inset-x-0 z-40 px-4 max-w-md mx-auto">
              <button onClick={() => setIsCartModalOpen(true)}
                className="w-full py-3.5 px-5 bg-[#7A2331] hover:bg-[#631c27] active:scale-98 text-white rounded-full shadow-2xl flex justify-between items-center transition-all cursor-pointer border border-rose-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">{cartItemCount}</div>
                  <span className="text-xs font-bold tracking-wide">{currentTableOrder ? 'Add to Order' : 'View Basket'}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-bold text-sm">
                  <span>Rs {grandTotal.toFixed(2)}</span>
                  <ArrowRight size={16} />
                </div>
              </button>
            </div>
          )}

          {/* ── CART MODAL ───────────────────────────────────────── */}
          {isCartModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-white text-[#171512] w-full max-w-md border border-[#EBE7E0] rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-center pb-3 border-b border-[#EBE7E0] mb-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8A8580] block">
                      Table {selectedTable} — {currentTableOrder ? 'Adding Items' : 'New Order'}
                    </span>
                    <h3 className="text-base font-bold text-[#171512]" style={SERIF}>
                      {currentTableOrder ? `Add to Order #${currentTableOrder.order_number || formatOrderId(currentTableOrder.id)}` : `Cart (${cartItemCount})`}
                    </h3>
                  </div>
                  <button onClick={() => setIsCartModalOpen(false)} className="w-8 h-8 rounded-full bg-[#F9F8F6] border border-[#EBE7E0] flex items-center justify-center text-[#8A8580] hover:text-[#171512]">
                    <X size={16} />
                  </button>
                </div>

                {/* Existing order items (read-only) */}
                {currentTableOrder && currentTableOrder.items?.length > 0 && (
                  <div className="mb-4">
                    <span className="text-[10px] font-bold text-[#8A8580] uppercase tracking-wider block mb-2">Current Items in Order</span>
                    <div className="space-y-1.5">
                      {currentTableOrder.items.map((item, idx) => (
                        <div key={idx} className="bg-zinc-50 border border-[#EBE7E0] rounded-xl p-2.5 flex items-center justify-between text-xs text-[#8A8580]">
                          <span className="font-medium truncate">{item.name}</span>
                          <span className="font-mono font-bold shrink-0 ml-2">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-b border-dashed border-[#EBE7E0] my-3" />
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-2">New Items Being Added</span>
                  </div>
                )}

                {/* New cart items */}
                <div className="space-y-2.5 mb-4">
                  {cart.map((i) => (
                    <div key={i.cartId} className="bg-[#F9F8F6] border border-[#EBE7E0] rounded-xl p-3 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <h4 className="font-semibold text-xs text-[#171512] truncate" style={SERIF}>{i.name}</h4>
                        <span className="text-[11px] italic font-mono" style={{ ...SERIF, color: WINE }}>Rs {i.price.toFixed(2)} x {i.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleUpdateQty(i.cartId, -1)} className="w-6 h-6 bg-white border border-[#EBE7E0] hover:bg-zinc-100 text-[#171512] rounded-md flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs">-</button>
                        <span className="font-mono text-xs font-bold text-[#171512] w-4 text-center">{i.quantity}</span>
                        <button onClick={() => handleUpdateQty(i.cartId, 1)} className="w-6 h-6 bg-white border border-[#EBE7E0] hover:bg-zinc-100 text-[#171512] rounded-md flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs">+</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kitchen Notes */}
                {!currentTableOrder && (
                  <div className="mb-4">
                    <label className="text-[10px] font-bold text-[#8A8580] block mb-1 uppercase tracking-wider">Kitchen Instructions</label>
                    <textarea rows={2} placeholder="e.g. Extra spicy, no onions..." value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full bg-[#F9F8F6] border border-[#EBE7E0] text-[#171512] text-xs p-2.5 rounded-xl focus:outline-none focus:border-[#7A2331] transition-colors" />
                  </div>
                )}

                {/* Totals (only for new orders) */}
                {!currentTableOrder && (
                  <div className="border-t border-[#EBE7E0] pt-3 space-y-1.5 text-xs mb-4">
                    <div className="flex justify-between text-[#8A8580]"><span>Subtotal</span><span className="font-mono">Rs {subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-[#8A8580]"><span>Tax & Service</span><span className="font-mono">Rs {(tax + serviceCharge).toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm font-bold text-[#171512] pt-2 border-t border-[#EBE7E0]">
                      <span>Grand Total</span>
                      <span className="text-base italic font-mono" style={{ ...SERIF, color: WINE }}>Rs {grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Waiter Attribution */}
                <div className="text-[10px] text-[#8A8580] text-center mb-3">
                  Order by: <strong className="text-[#171512]">{waiterName}</strong>
                </div>

                {/* Submit */}
                <button onClick={handleSubmitWaiterOrder} disabled={submittingOrder || cart.length === 0}
                  className="w-full py-3.5 bg-[#7A2331] hover:bg-[#631c27] active:scale-98 text-white font-bold text-xs rounded-2xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
                  {submittingOrder ? 'Submitting...' : (currentTableOrder ? `Add ${cartItemCount} Item(s) to Order` : `Submit Order for Table ${selectedTable}`)}
                </button>
              </div>
            </div>
          )}
        </main>
      )}
      {renderAssistancePopup()}
    </div>
  );
}
