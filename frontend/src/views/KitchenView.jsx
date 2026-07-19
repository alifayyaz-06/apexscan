import React, { useState, useEffect } from 'react';
import { realTimeSync } from '../utils/socket';
import { useAuth } from '../context/AuthContext';

import { API_URL } from '../utils/config';

const BACKEND_URL = API_URL;

export function KitchenCard({ order, onStatusChange }) {
  const [elapsed, setElapsed] = useState(0);
  const [completedItems, setCompletedItems] = useState({}); // { index: boolean }

  // Timer calculation
  useEffect(() => {
    const interval = setInterval(() => {
      const diffSec = Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 1000);
      setElapsed(diffSec);
    }, 1000);

    return () => clearInterval(interval);
  }, [order.timestamp]);

  const formatElapsed = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Warning thresholds (> 5 mins is warning, > 8 mins is critical alarm)
  const isCritical = elapsed > 480;
  const isWarning = elapsed > 300;

  const toggleItemCheck = (idx) => {
    setCompletedItems(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <div className={`relative bg-white p-5 flex flex-col justify-between rounded-2xl transition-all duration-300 ${
      isCritical 
        ? 'border border-red-200 bg-red-50/10 animate-pulse' 
        : isWarning 
          ? 'border border-amber-200 bg-amber-50/10' 
          : 'border border-zinc-200'
    }`}>
      {/* Header */}
      <div>
        <div className="flex justify-between items-center border-b border-zinc-100 pb-3 mb-4 text-black">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-zinc-950">Table {order.table_name || order.table}</span>
              <span className={`text-[0.65rem] px-2 py-0.5 font-black uppercase tracking-wider border-2 rounded-lg shadow-sm ${
                order.order_type === 'delivery' 
                  ? 'bg-orange-100 text-orange-800 border-orange-300' 
                  : order.order_type === 'takeaway' 
                    ? 'bg-purple-100 text-purple-800 border-purple-300' 
                    : 'bg-zinc-100 text-zinc-800 border-zinc-300'
              }`}>
                {order.order_type === 'delivery' ? 'Delivery' : order.order_type === 'takeaway' ? 'Take Away' : 'Dine In'}
              </span>
            </div>
            <span className="text-xs font-mono text-zinc-400">#{order.order_number || order.id.slice(0, 8)}</span>
          </div>
          <div className="text-right">
            <div className={`font-mono font-bold text-sm ${
              isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-zinc-700'
            }`}>
              {isCritical ? 'CRITICAL: ' : isWarning ? 'WARN: ' : ''}{formatElapsed(elapsed)}
            </div>
            <div className="text-zinc-400 text-[0.68rem] font-mono">
              {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Checklist items */}
        <ul className="flex flex-col gap-2.5 mb-6">
          {order.items.map((item, idx) => {
            const isChecked = completedItems[idx];
            return (
              <li
                key={idx}
                onClick={() => toggleItemCheck(idx)}
                className={`flex justify-between items-center p-2.5 border cursor-pointer select-none rounded-xl transition-all duration-200 ${
                  isChecked 
                    ? 'bg-zinc-50 border-zinc-200/60 text-zinc-400 line-through' 
                    : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'
                }`}
              >
                <span className="font-semibold text-sm">{item.name}</span>
                <span className={`font-bold text-xs px-2 py-0.5 rounded-lg border ${
                  isChecked ? 'bg-zinc-100 text-zinc-400 border-zinc-200' : 'bg-white text-zinc-900 border-zinc-200'
                }`}>
                  x{item.quantity}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Action Footer */}
      <div className="mt-2">
        {order.status === 'confirmed' && (
          <button
            onClick={() => onStatusChange(order.id, 'cooking')}
            className="w-full py-3 bg-black text-white hover:bg-zinc-800 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            Start Cooking
          </button>
        )}
        {order.status === 'cooking' && (
          <button
            onClick={() => onStatusChange(order.id, 'ready')}
            className="w-full py-3 bg-black text-white hover:bg-zinc-800 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            ✓ Done & Alert Waiter
          </button>
        )}
        {order.status === 'ready' && (
          <div className="w-full py-3 bg-zinc-50 text-zinc-500 font-bold text-sm rounded-xl text-center border border-zinc-200">
            Awaiting Waiter Pickup
          </div>
        )}
      </div>
    </div>
  );
}

export default function KitchenView() {
  const { user, logout, authHeaders } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'history'
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historySearch, setHistorySearch] = useState('');

  useEffect(() => {
    if (user?.restaurantSlug) {
      realTimeSync.registerRestaurant(user.restaurantSlug, user.role);
    } else if (user?.restaurantId) {
      realTimeSync.registerRestaurant(user.restaurantId, user.role);
    }
    loadActiveOrders();

    // Listen for WebSocket state updates
    const onCreated = realTimeSync.on('ORDER_CREATED', (payload) => {
      // Only process orders of this restaurant
      const myId = user?.restaurantId;
      const mySlug = user?.restaurantSlug;
      const hasIdMatch = myId && payload.restaurantId && payload.restaurantId === myId;
      const hasSlugMatch = mySlug && payload.restaurantSlug && payload.restaurantSlug === mySlug;
      if ((myId || mySlug) && !hasIdMatch && !hasSlugMatch) return;

      playKitchenSound();
      setOrders(prev => {
        // Prevent duplicate appending
        if (prev.some(o => o.id === payload.order.id)) return prev;
        return [payload.order, ...prev];
      });
    });

    const onUpdated = realTimeSync.on('ORDER_UPDATED', (payload) => {
      const myId = user?.restaurantId;
      const mySlug = user?.restaurantSlug;
      const hasIdMatch = myId && payload.restaurantId && payload.restaurantId === myId;
      const hasSlugMatch = mySlug && payload.restaurantSlug && payload.restaurantSlug === mySlug;
      if ((myId || mySlug) && !hasIdMatch && !hasSlugMatch) return;

      const updatedOrder = payload.order;
      setOrders(prev => {
        // If order completed or cancelled, remove from KDS
        if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
          return prev.filter(o => o.id !== updatedOrder.id);
        }
        
        const idx = prev.findIndex(o => o.id === updatedOrder.id);
        if (idx !== -1) {
          const cloned = [...prev];
          cloned[idx] = updatedOrder;
          return cloned;
        } else {
          return [updatedOrder, ...prev];
        }
      });
    });

    return () => {
      realTimeSync.off('ORDER_CREATED', onCreated);
      realTimeSync.off('ORDER_UPDATED', onUpdated);
    };
  }, []);

  const loadActiveOrders = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders/active`, { headers: authHeaders() });
      const result = await res.json();
      if (result.success) {
        setOrders(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadHistoryOrders = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders`, { headers: authHeaders() });
      const result = await res.json();
      if (result.success) {
        // Show only completed/served orders (ones that went through the kitchen)
        const prepared = result.data.filter(o => o.status === 'completed' || o.status === 'served' || o.status === 'ready');
        setHistoryOrders(prepared);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const playKitchenSound = () => {
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/911/911-84.wav");
      audio.play().catch(() => {});
    } catch (e) {}
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await res.json();
      if (result.success) {
        loadActiveOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered history
  const filteredHistory = historyOrders.filter(o => {
    const q = historySearch.toLowerCase();
    if (!q) return true;
    return o.id.toLowerCase().includes(q) || (o.table_name || o.table || '').toString().includes(q);
  });

  // Group columns
  const backlog = orders.filter(o => o.status === 'confirmed');
  const preparing = orders.filter(o => o.status === 'cooking');
  const ready = orders.filter(o => o.status === 'ready');

  return (
    <div className="min-h-screen bg-white text-black py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header bar */}
        <header className="bg-white border border-zinc-200 rounded-2xl px-6 py-5 mb-8 flex flex-col md:flex-row justify-between items-center gap-4 text-black">
          <div className="flex items-center gap-4">
            {user?.restaurantLogo ? (
              <img src={user.restaurantLogo} className="h-11 w-auto object-contain rounded-xl border border-zinc-100 p-1 bg-white" alt={user.restaurantName} />
            ) : (
              <span className="text-lg font-bold border border-zinc-200 bg-zinc-50 px-3 py-1.5 rounded-xl select-none text-zinc-800">KDS</span>
            )}
            <div>
              <h1 className="text-xl font-black tracking-tight text-zinc-900 leading-none flex items-center gap-2">
                <span className="font-extrabold text-black font-playwrite">{user?.restaurantName || 'Apex Scan'}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-white px-2.5 py-1 rounded-md">KDS PANEL</span>
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <p className="text-zinc-500 text-xs">Live backlog & cooking station display</p>
                <span className="text-[10px] font-semibold bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-md text-zinc-600 uppercase">
                  CHEF: {user?.displayName || 'Chef'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Tab Switcher */}
            <nav className="flex bg-zinc-50 border border-zinc-200 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('live')}
                className={`px-5 py-2 text-xs font-bold transition-all ${
                  activeTab === 'live'
                    ? 'bg-white text-black shadow-sm rounded-lg'
                    : 'text-zinc-400 hover:text-black'
                }`}
              >
                LIVE ({orders.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('history');
                  loadHistoryOrders();
                }}
                className={`px-5 py-2 text-xs font-bold transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-black shadow-sm rounded-lg'
                    : 'text-zinc-400 hover:text-black'
                }`}
              >
                HISTORY
              </button>
            </nav>
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-4 py-2 rounded-xl text-xs text-zinc-600 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              SYNC ACTIVE
            </div>
            <button onClick={logout} className="text-xs font-bold bg-white text-black border border-zinc-250 hover:bg-zinc-50 px-4 py-2 rounded-xl transition-colors">
              SIGN OUT
            </button>
          </div>
        </header>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB: LIVE KDS GRID                  */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Backlog */}
            <section className="bg-white border border-zinc-150 rounded-2xl p-5 flex flex-col min-h-[600px]">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-5 text-black">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                  Backlog Queue
                </h2>
                <span className="bg-zinc-50 text-zinc-700 font-semibold text-xs px-2.5 py-1 rounded-lg border border-zinc-200">
                  {backlog.length}
                </span>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[680px]">
                {backlog.length === 0 ? (
                  <p className="text-zinc-400 text-center py-12 text-sm italic">[ No pending dishes in queue ]</p>
                ) : (
                  backlog.map(order => (
                    <KitchenCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Column 2: Preparing */}
            <section className="bg-white border border-zinc-150 rounded-2xl p-5 flex flex-col min-h-[600px]">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-5 text-black">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                  Cooking Station
                </h2>
                <span className="bg-zinc-50 text-zinc-700 font-semibold text-xs px-2.5 py-1 rounded-lg border border-zinc-200">
                  {preparing.length}
                </span>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[680px]">
                {preparing.length === 0 ? (
                  <p className="text-zinc-400 text-center py-12 text-sm italic">[ No active dishes cooking ]</p>
                ) : (
                  preparing.map(order => (
                    <KitchenCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Column 3: Ready */}
            <section className="bg-white border border-zinc-150 rounded-2xl p-5 flex flex-col min-h-[600px]">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-5 text-black">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                  Ready to Serve
                </h2>
                <span className="bg-zinc-50 text-zinc-700 font-semibold text-xs px-2.5 py-1 rounded-lg border border-zinc-200">
                  {ready.length}
                </span>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[680px]">
                {ready.length === 0 ? (
                  <p className="text-zinc-400 text-center py-12 text-sm italic">[ No plates waiting for waiter pickup ]</p>
                ) : (
                  ready.map(order => (
                    <KitchenCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB: PREPARED ORDERS HISTORY        */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === 'history' && (
          <div className="text-black">
            <div className="bg-white border border-zinc-150 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-100 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Prepared Orders History</h2>
                  <p className="text-zinc-500 text-xs mt-1">{historyOrders.length} orders prepared by kitchen</p>
                </div>
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    placeholder="Search by Order ID or Table..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full py-2.5 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 text-sm outline-none transition-colors focus:bg-white focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                <table className="w-full text-left text-sm text-zinc-800">
                  <thead className="text-xs uppercase bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Order ID</th>
                      <th className="px-5 py-3.5 font-bold">Table</th>
                      <th className="px-5 py-3.5 font-bold">Items Prepared</th>
                      <th className="px-5 py-3.5 font-bold text-center">Total Dishes</th>
                      <th className="px-5 py-3.5 font-bold">Status</th>
                      <th className="px-5 py-3.5 font-bold">Total</th>
                      <th className="px-5 py-3.5 font-bold">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-5 py-12 text-center text-zinc-400 italic">[ No prepared orders found ]</td>
                      </tr>
                    ) : (
                      filteredHistory.map(order => (
                        <tr key={order.id} className="bg-white hover:bg-zinc-50/80 transition-colors border-b border-zinc-100 last:border-b-0">
                          <td className="px-5 py-3.5 font-mono text-xs text-zinc-900 font-semibold">#{order.order_number || order.id.slice(0, 8)}</td>
                          <td className="px-5 py-3.5 font-semibold text-zinc-900">Table {order.table_name || order.table}</td>
                          <td className="px-5 py-3.5 max-w-[280px]">
                            <div className="flex flex-wrap gap-1.5">
                              {order.items.map((item, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs font-semibold px-2 py-0.5 rounded-lg">
                                  {item.name}
                                  <span className="text-zinc-400 font-bold">×{item.quantity}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="bg-zinc-50 text-zinc-700 font-semibold text-xs px-2.5 py-1 rounded-lg border border-zinc-200">
                              {order.items.reduce((sum, i) => sum + i.quantity, 0)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-800 uppercase border border-zinc-200">
                              {order.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-zinc-950">${order.billing.total.toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-xs text-zinc-500 font-mono">
                            {new Date(order.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
