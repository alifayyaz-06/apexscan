import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { realTimeSync } from '../utils/socket';

import { API_URL } from '../utils/config';

const BACKEND_URL = API_URL;

export function FoodCategoryCard({ item, quantity, onQtyChange }) {
  return (
    <div className="relative bg-white border border-slate-100/60 rounded-xl px-3 pb-3 pt-12 sm:px-5 sm:pb-5 sm:pt-16 flex flex-col justify-between h-full shadow-[0_8px_20px_rgba(0,0,0,0.035)] hover:-translate-y-1.5 hover:shadow-[0_12px_24px_rgba(0,0,0,0.055)] transition-all duration-300 ease-in-out mt-10 sm:mt-12">
      {/* Circular overlapping image */}
      <div className="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-slate-100/60 bg-white overflow-hidden shadow-[0_4px_10px_rgba(0,0,0,0.03)] group">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";
          }}
        />
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-grow text-center">
        <h3 className="text-charcoal font-extrabold uppercase text-[0.78rem] sm:text-[0.95rem] tracking-wider line-clamp-1 mb-1 sm:mb-2">
          {item.name}
        </h3>
        <p className="text-slate-500 text-[10px] sm:text-xs line-clamp-2 leading-tight flex-grow">
          {item.description}
        </p>
        <div className="text-primary font-black text-sm sm:text-lg mt-2">
          ${item.price.toFixed(2)}
        </div>
      </div>

      {/* Interactive Cart Button with Quantity Selector */}
      <div className="relative h-8 sm:h-10 w-full mt-3">
        {quantity > 0 ? (
          <div className="flex items-center justify-between w-full h-full border border-primary bg-white rounded-full overflow-hidden animate-pop-in">
            <button
              onClick={() => onQtyChange(item.id, -1)}
              className="w-8 sm:w-10 h-full flex items-center justify-center text-primary font-bold text-base sm:text-lg hover:bg-rose-50/50 active:scale-95 transition-all"
            >
              −
            </button>
            <span className="font-extrabold text-charcoal text-xs sm:text-sm">
              {quantity}
            </span>
            <button
              onClick={() => onQtyChange(item.id, 1)}
              className="w-8 sm:w-10 h-full flex items-center justify-center text-primary font-bold text-base sm:text-lg hover:bg-rose-50/50 active:scale-95 transition-all"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={() => onQtyChange(item.id, 1)}
            className="w-full h-full bg-primary text-white font-extrabold text-xs sm:text-sm rounded-full shadow-sm hover:bg-primary-hover active:scale-95 transition-all duration-200 animate-pop-in"
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}

export default function CustomerView() {
  const [currentTable, setCurrentTable] = useState(null);
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [resolvedUuid, setResolvedUuid] = useState(null);
  const [landingExplored, setLandingExplored] = useState(false);
  const [menuData, setMenuData] = useState([]);
  const [category, setCategory] = useState('all');
  const [cart, setCart] = useState({}); // { itemId: quantity }
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showDemoTableOverlay, setShowDemoTableOverlay] = useState(false);
  const [selectedDemoTable, setSelectedDemoTable] = useState('1');

  // Detect table and load initial orders/menu
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let table = urlParams.get('table');

    // Parse dynamic restaurant slug from path prefix (e.g. /r/kfc/customer)
    const pathMatch = window.location.pathname.match(/^\/r\/([^/]+)/);
    const pathSlug = pathMatch ? pathMatch[1] : null;

    let restId = pathSlug || urlParams.get('restaurant');
    
    if (!table) {
      table = localStorage.getItem('ordering_table');
    }
    if (!restId) {
      restId = localStorage.getItem('ordering_restaurant');
    }

    if (restId) {
      setRestaurantId(restId);
      localStorage.setItem('ordering_restaurant', restId);
    }

    if (table) {
      setCurrentTable(table);
      localStorage.setItem('ordering_table', table);
      // Fetch order details for session tracking
      const savedOrderId = localStorage.getItem(`active_order_table_${table}`);
      if (savedOrderId) {
        setActiveOrderId(savedOrderId);
        fetchOrderDetails(savedOrderId);
      }
    } else {
      setShowDemoTableOverlay(true);
    }

    // Load Menu catalog
    loadMenu(restId);
    loadRestaurantInfo(restId);
  }, []);

  // Sync WebSocket when restaurant context is available
  useEffect(() => {
    // In CustomerView, restaurantId is the slug from URL/localStorage
    if (restaurantId) {
      realTimeSync.registerRestaurant(restaurantId, 'customer');
    }
  }, [restaurantId]);

  // WebSockets updates for active tracking orders
  useEffect(() => {
    const onUpdated = realTimeSync.on('ORDER_UPDATED', (payload) => {
      const updatedOrder = payload.order;
      if (updatedOrder && activeOrderId && updatedOrder.id === activeOrderId) {
        setActiveOrder(updatedOrder);
        // Play bell alert if status changes
        if (activeOrder && activeOrder.status !== updatedOrder.status) {
          playAudioAlert();
        }
        // If order was cancelled or completed, clean active order local states
        if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
          localStorage.removeItem(`active_order_table_${currentTable}`);
          setActiveOrderId(null);
          setActiveOrder(null);
        }
      }
    });

    return () => {
      realTimeSync.off('ORDER_UPDATED', onUpdated);
    };
  }, [activeOrderId, activeOrder, currentTable]);

  const loadMenu = async (rId) => {
    try {
      const targetRestaurant = rId || restaurantId;
      const url = targetRestaurant 
        ? `${BACKEND_URL}/api/v1/menu?restaurant_id=${targetRestaurant}`
        : `${BACKEND_URL}/api/v1/menu`;
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        setMenuData(result.data);
        if (result.data.length > 0 && result.data[0].restaurant_id) {
          setResolvedUuid(result.data[0].restaurant_id);
        }
      }
    } catch (err) {
      console.error('Menu load error:', err);
    }
  };

  const loadRestaurantInfo = async (slug) => {
    if (!slug) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/restaurants/public/${slug}`);
      const result = await res.json();
      if (result.success) {
        setRestaurantInfo(result.data);
      }
    } catch (err) {
      console.error('Restaurant info load error:', err);
    }
  };

  const renderBranding = (isLanding = false) => {
    if (restaurantInfo) {
      return (
        <div className="flex items-center gap-3 justify-center">
          {restaurantInfo.logo_url && (
            <img src={restaurantInfo.logo_url} className={`${isLanding ? 'h-14 sm:h-16' : 'h-8 sm:h-9'} w-auto object-contain rounded-xl`} alt={restaurantInfo.name} />
          )}
          <span className={`${isLanding ? 'text-3xl sm:text-4xl text-white' : 'text-lg sm:text-xl text-charcoal'} font-black`}>
            {restaurantInfo.name}
          </span>
        </div>
      );
    }
    return (
      <div className={`font-playwrite font-bold tracking-tight ${isLanding ? 'text-white text-3xl sm:text-4xl' : 'text-charcoal text-xl'}`}>
        Gourmet<span className="text-primary">Bistro</span>
      </div>
    );
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders/${orderId}`);
      const result = await res.json();
      if (result.success) {
        setActiveOrder(result.data);
        setLandingExplored(true); // Bypass welcome screen for tracker
      } else {
        // Order not found, wipe outdated local storage
        localStorage.removeItem(`active_order_table_${currentTable}`);
        setActiveOrderId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDemoTableSubmit = () => {
    localStorage.setItem('ordering_table', selectedDemoTable);
    window.location.href = `${window.location.pathname}?table=${selectedDemoTable}`;
  };

  const handleQuantityChange = (itemId, change) => {
    const currentQty = cart[itemId] || 0;
    const newQty = Math.max(0, currentQty + change);
    
    const updatedCart = { ...cart };
    if (newQty === 0) {
      delete updatedCart[itemId];
    } else {
      updatedCart[itemId] = newQty;
    }
    setCart(updatedCart);
  };

  const playAudioAlert = () => {
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/911/911-84.wav");
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Cart math
  const getCartTotals = () => {
    let subtotal = 0;
    let count = 0;
    
    Object.keys(cart).forEach(id => {
      const item = menuData.find(m => m.id === id);
      if (item) {
        subtotal += item.price * cart[id];
        count += cart[id];
      }
    });

    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const service = parseFloat((subtotal * 0.05).toFixed(2));
    const total = parseFloat((subtotal + tax + service).toFixed(2));

    return { subtotal, count, tax, service, total };
  };

  const { subtotal, count, tax, service, total } = getCartTotals();

  const handlePlaceOrder = async () => {
    const itemsArray = Object.keys(cart).map(id => ({
      id,
      quantity: cart[id]
    }));

    if (itemsArray.length === 0) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          table: currentTable, 
          items: itemsArray,
          restaurant_id: restaurantId 
        })
      });
      const result = await response.json();
      if (result.success) {
        const order = result.data;
        setActiveOrderId(order.id);
        setActiveOrder(order);
        localStorage.setItem(`active_order_table_${currentTable}`, order.id);
        setCart({});
        setIsCartOpen(false);
        playAudioAlert();
      }
    } catch (err) {
      toast.error("Error placing order. Server connection issues.");
    }
  };

  const filteredMenu = category === 'all' 
    ? menuData 
    : menuData.filter(item => item.category === category);

  // If table overlay needs to show
  if (showDemoTableOverlay) {
    return (
      <div className="fixed inset-0 bg-black/55 backdrop-blur-md z-[300] flex items-center justify-center p-6">
        <div className="bg-white text-charcoal w-full max-w-sm p-8 rounded-2xl shadow-xl text-center border border-slate-100">
          <h2 className="text-xl font-extrabold mb-3">Table QR Code Required</h2>
          <p className="text-slate-550 text-sm leading-relaxed mb-6">
            Please scan a table QR code or select a demo table number below to explore the menu.
          </p>
          <div className="mb-6">
            <select
              value={selectedDemoTable}
              onChange={(e) => setSelectedDemoTable(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-charcoal font-medium focus:border-primary outline-none"
            >
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>Table {i + 1}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleDemoTableSubmit}
            className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all"
          >
            Start Ordering
          </button>
        </div>
      </div>
    );
  }

  // Render Landing Page Welcome Screen
  if (!landingExplored) {
    return (
      <div className="relative flex justify-center items-center min-h-screen p-6 box-border text-center overflow-hidden animate-fade-in">
        {/* Animated Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10000ms] scale-105 animate-[zoomBg_20s_infinite_alternate]"
          style={{ backgroundImage: `url('/restaurant_bg.png')` }}
        />
        {/* Soft Dark Contrast Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/70 to-black/85 backdrop-blur-[2px]" />
        
        {/* Content Panel */}
        <div className="relative max-w-[600px] flex flex-col items-center gap-6 text-white z-10">
          {renderBranding(true)}
          <h1 className="text-3xl sm:text-4.5xl font-black text-white leading-tight mt-2">
            Crafting Culinary Moments
          </h1>
          <p className="text-sm sm:text-base font-playwrite text-slate-200 leading-relaxed max-w-[480px]">
            "Culinary Excellence in Every Dish, Crafted with Passion."
          </p>

          {/* Restaurant Motive Story Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mt-2 backdrop-blur-md max-w-[460px] text-center shadow-inner">
            <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-primary mb-2">Our Culinary Motive</h2>
            <p className="text-slate-300 text-xs leading-relaxed font-medium">
              At Gourmet Bistro, we believe dining is more than just food—it is an art form. Our chefs select local, sustainable organic harvests to craft plates that inspire. Every texture, aroma, and presentation is designed to create a timeless sensory memory.
            </p>
          </div>

          <div className="bg-primary/20 text-primary border border-primary/30 px-6 py-2 rounded-full font-bold text-sm tracking-widest uppercase mt-4">
            Table {currentTable}
          </div>
          <button
            onClick={() => setLandingExplored(true)}
            className="explore-btn flex items-center gap-2 bg-primary text-white font-bold py-4 px-9 rounded-full shadow-lg shadow-primary/30 hover:bg-primary-hover hover:scale-105 transition-all duration-300 mt-6 group"
          >
            <span>Explore Today's Menu</span>
            <span className="text-lg transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-charcoal animate-fade-in pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-white/95 border-b border-slate-100 py-4 px-6 flex justify-between items-center z-40 shadow-sm backdrop-blur-sm">
        {renderBranding(false)}
        <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full font-bold text-xs tracking-wider uppercase">
          Table {currentTable}
        </div>
      </header>

      {/* Main Menu Grid Catalog */}
      <main className="max-w-[1000px] mx-auto px-5 py-8">
        {/* Category Selector Nav */}
        <nav className="flex gap-2.5 overflow-x-auto py-2 mb-8 scrollbar-none">
          {Array.from(new Set([
            'all',
            ...Array.from(new Set(menuData.map(item => item.category).filter(Boolean)))
          ])).map(catId => {
            let icon = '🍲';
            let label = catId.charAt(0).toUpperCase() + catId.slice(1);
            if (catId === 'all') {
              icon = '🍽️';
              label = 'All';
            } else {
              const lower = catId.toLowerCase();
              if (lower.includes('starter') || lower.includes('appetiz') || lower.includes('salad')) icon = '🥗';
              else if (lower.includes('main') || lower.includes('steak') || lower.includes('burger') || lower.includes('pizza') || lower.includes('food')) icon = '🥩';
              else if (lower.includes('dessert') || lower.includes('sweet') || lower.includes('cake')) icon = '🍰';
              else if (lower.includes('drink') || lower.includes('beverag') || lower.includes('juice') || lower.includes('water')) icon = '🍹';
            }

            return (
              <button
                key={catId}
                onClick={() => setCategory(catId)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all border outline-none shrink-0 ${
                  category === catId
                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-charcoal'
                }`}
              >
                <span>{icon}</span> {label}
              </button>
            );
          })}
        </nav>

        {/* Menu Cards Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-3.5 mt-4">
          {filteredMenu.map(item => (
            <FoodCategoryCard
              key={item.id}
              item={item}
              quantity={cart[item.id] || 0}
              onQtyChange={handleQuantityChange}
            />
          ))}
        </section>
      </main>

      {/* Floating Cart Bar */}
      {count > 0 && !activeOrderId && (
        <div
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[500px] bg-primary text-white flex justify-between items-center py-4 px-6 rounded-full shadow-lg shadow-primary/20 hover:scale-[1.01] hover:bg-primary-hover transition-all cursor-pointer z-50 animate-pop-in"
        >
          <div className="flex items-center gap-3">
            <span className="relative text-lg">
              🛒 <span className="absolute -top-2.5 -right-3 bg-white text-primary font-extrabold text-[0.7rem] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-sm">{count}</span>
            </span>
            <span className="font-semibold text-sm">View your order</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">Rs {total.toFixed(2)}</span>
            <span className="text-base">→</span>
          </div>
        </div>
      )}

      {/* Cart Drawer Overlay */}
      {isCartOpen && (
        <div
          onClick={() => setIsCartOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-[440px] h-full shadow-xl flex flex-col animate-[slideLeft_0.3s_cubic-bezier(0.4,_0,_0.2,_1)]"
          >
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold">Your Cart</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-2xl text-slate-400 hover:text-slate-900">
                ✕
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
              {Object.keys(cart).length === 0 ? (
                <p className="text-slate-400 text-center py-12">Your cart is empty. Add items from the menu!</p>
              ) : (
                Object.keys(cart).map(id => {
                  const item = menuData.find(m => m.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-xl">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{item.name}</span>
                        <span className="text-xs text-rose-500 font-medium">Rs {item.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
                        <button onClick={() => handleQuantityChange(id, -1)} className="text-rose-500 font-bold text-sm">−</button>
                        <span className="font-bold text-xs text-slate-800">{cart[id]}</span>
                        <button onClick={() => handleQuantityChange(id, 1)} className="text-rose-500 font-bold text-sm">+</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {Object.keys(cart).length > 0 && (
              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <div className="flex justify-between text-sm text-slate-500 mb-2">
                  <span>Subtotal</span>
                  <span>Rs {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500 mb-2">
                  <span>VAT & Tax (8%)</span>
                  <span>Rs {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500 mb-4">
                  <span>Service Charge (5%)</span>
                  <span>Rs {service.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 my-3"></div>
                <div className="flex justify-between text-lg font-bold mb-5">
                  <span>Grand Total</span>
                  <span>Rs {total.toFixed(2)}</span>
                </div>
                <button
                  onClick={handlePlaceOrder}
                  className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-full transition-colors shadow-md shadow-primary/20"
                >
                  Place Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stepper Status Tracking Modal Overlay */}
      {activeOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white text-charcoal w-full max-w-[500px] border border-slate-100 p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto animate-[scaleUp_0.3s_ease-out]">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
              <span className="pulse-indicator"></span>
              <h2 className="text-lg font-bold flex-grow">Order Tracking</h2>
              <span className="order-id">{activeOrder.id}</span>
            </div>

            {/* Stepper Graphics */}
            <div className="flex flex-col gap-4 mb-6">
              {[
                { id: 'pending', title: 'Placed', desc: 'Waiting for review' },
                { id: 'confirmed', title: 'Confirmed', desc: 'Accepted by waiter' },
                { id: 'cooking', title: 'Preparing', desc: 'Chef is preparing your meal' },
                { id: 'ready', title: 'Ready', desc: 'On the way to your table' },
                { id: 'completed', title: 'Served', desc: 'Enjoy your food!' }
              ].map((step, idx) => {
                const stepsList = ['pending', 'confirmed', 'cooking', 'ready', 'completed'];
                const currentIdx = stepsList.indexOf(activeOrder.status);
                const isCompleted = idx < currentIdx;
                const isActive = idx === currentIdx;

                return (
                  <div key={step.id} className={`flex gap-4 items-start transition-opacity duration-300 ${isActive ? 'opacity-100' : isCompleted ? 'opacity-80' : 'opacity-35'}`}>
                    <div className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                      isCompleted ? 'bg-emerald-500 text-white' : isActive ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{step.title}</div>
                      <div className="text-slate-500 text-[0.75rem]">{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-5">
              <h3 className="font-bold text-sm mb-3">Order Items</h3>
              <ul className="flex flex-col gap-2">
                {activeOrder.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-xs text-slate-655">
                    <span>{item.name} x{item.quantity}</span>
                    <span>Rs {(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-200 my-3"></div>
              <div className="flex justify-between font-bold text-sm text-charcoal">
                <span>Total Bill</span>
                <span>Rs {activeOrder.billing.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[0.78rem] text-slate-500 mb-3">You can close this tracker; we will notify you when things change.</p>
              <button
                onClick={() => setActiveOrder(null)} // hide overlay locally
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-charcoal font-bold rounded-xl transition-colors"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
