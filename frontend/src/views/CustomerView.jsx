import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { realTimeSync } from '../utils/socket';
import { API_URL } from '../utils/config';
import { 
  Search, 
  Star, 
  ShoppingBag, 
  X, 
  Plus, 
  Minus, 
  Check, 
  ArrowRight, 
  QrCode,
  Flame,
  Compass
} from 'lucide-react';

const BACKEND_URL = API_URL;

export function FoodCategoryCard({ item, quantity, onQtyChange }) {
  // Generate a premium look with deterministic rating/promo tags
  const rating = ((item.id.charCodeAt(0) % 5) * 0.1 + 4.5).toFixed(1);
  const isPromo = item.price > 20; // Show "10% OFF" for premium items (Rs > 20)

  return (
    <div className="group bg-white border border-[#ECECEC] rounded-3xl overflow-hidden flex flex-col justify-between h-full shadow-[0_8px_30px_rgb(0,0,0,0.01)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.035)] hover:-translate-y-1.5 transition-all duration-300 ease-out">
      {/* Food Image and Badges */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50 border-b border-[#ECECEC]">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";
          }}
        />
        {/* Rating Badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-extrabold text-[#111111] flex items-center gap-1 shadow-sm">
          <span className="text-[#E63946]">★</span>
          <span>{rating}</span>
        </div>
        
        {/* Discount Badge */}
        {isPromo && (
          <div className="absolute top-3 right-3 bg-[#E63946] text-white px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm animate-pulse">
            10% OFF
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="p-4 sm:p-5 flex flex-col flex-grow justify-between">
        <div className="flex flex-col flex-grow mb-4">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#E63946] mb-1">
            {item.category || 'Mains'}
          </span>
          <h3 className="text-base font-extrabold text-[#111111] tracking-tight leading-tight line-clamp-1 mb-1.5">
            {item.name}
          </h3>
          <p className="text-xs text-[#666666] font-medium leading-relaxed line-clamp-2">
            {item.description}
          </p>
        </div>

        {/* Action / Price Area */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#F8F8F8]">
          <span className="text-base sm:text-lg font-black text-[#111111]">
            Rs {item.price.toFixed(2)}
          </span>
          
          <div className="h-9 w-28 shrink-0">
            {quantity > 0 ? (
              <div className="flex items-center justify-between w-full h-full border-2 border-[#111111] bg-white rounded-xl overflow-hidden animate-pop-in">
                <button
                  onClick={() => onQtyChange(item.id, -1)}
                  className="w-9 h-full flex items-center justify-center text-[#111111] font-black text-base hover:bg-slate-50 active:scale-90 transition-all cursor-pointer"
                >
                  −
                </button>
                <span className="font-extrabold text-[#111111] text-xs sm:text-sm">
                  {quantity}
                </span>
                <button
                  onClick={() => onQtyChange(item.id, 1)}
                  className="w-9 h-full flex items-center justify-center text-[#111111] font-black text-base hover:bg-slate-50 active:scale-90 transition-all cursor-pointer"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={() => onQtyChange(item.id, 1)}
                className="w-full h-full bg-[#111111] hover:bg-zinc-900 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-sm hover:scale-[1.02] active:scale-98 transition-all duration-200 cursor-pointer"
              >
                Add to Cart
              </button>
            )}
          </div>
        </div>
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
  const [searchTerm, setSearchTerm] = useState('');
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

  // Filtering Logic (Category & Search Term combined)
  const filteredMenu = menuData.filter(item => {
    const matchesCategory = category === 'all' || item.category === category;
    const matchesSearch = searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Table selector overlay when table URL parameter is missing
  if (showDemoTableOverlay) {
    return (
      <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-6 animate-fade-in">
        <div className="bg-white text-[#111111] w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center border border-[#ECECEC]">
          <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center text-white mx-auto mb-5">
            <QrCode className="w-7 h-7 text-[#C6FF2E]" />
          </div>
          <h2 className="text-xl font-black mb-2 text-[#111111]">Table QR Required</h2>
          <p className="text-[#666666] text-xs font-semibold leading-relaxed mb-6 max-w-xs mx-auto">
            Please scan the QR code at your table. Or select a demo table number below to test ordering.
          </p>
          <div className="mb-6">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#666666] text-left mb-2 pl-1">
              Select Demo Table
            </label>
            <select
              value={selectedDemoTable}
              onChange={(e) => setSelectedDemoTable(e.target.value)}
              className="w-full p-3.5 bg-[#F8F8F8] border border-[#ECECEC] rounded-2xl text-[#111111] text-sm font-extrabold focus:border-zinc-800 outline-none cursor-pointer"
            >
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>Table {i + 1}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleDemoTableSubmit}
            className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-sm"
          >
            Start Ordering
          </button>
        </div>
      </div>
    );
  }

  // Welcome page screen (first scan entry)
  if (!landingExplored) {
    return (
      <div className="relative flex justify-center items-center min-h-screen p-6 box-border text-center overflow-hidden animate-fade-in">
        {/* Animated Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20000ms] scale-105 animate-[zoomBg_25s_infinite_alternate]"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80')` }}
          onError={(e) => {
            e.target.style.backgroundImage = "url('/restaurant_bg.png')";
          }}
        />
        {/* Dark Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-zinc-950/80 to-zinc-950/95 backdrop-blur-[3px]" />
        
        {/* Content Box */}
        <div className="relative max-w-[540px] flex flex-col items-center gap-6 text-white z-10 animate-[scaleUp_0.4s_ease-out]">
          {/* Logo / Brand */}
          <div className="flex flex-col items-center gap-3">
            {restaurantInfo?.logo_url ? (
              <img 
                src={restaurantInfo.logo_url} 
                className="h-16 w-16 object-contain rounded-2xl bg-white/10 backdrop-blur-md p-2 border border-white/20 shadow-xl" 
                alt={restaurantInfo.name} 
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#C6FF2E] flex items-center justify-center text-zinc-950 font-black text-2xl shadow-xl">
                {restaurantInfo?.name?.charAt(0) || 'G'}
              </div>
            )}
            <span className="text-2xl font-black tracking-tight text-white mt-1">
              {restaurantInfo?.name || "Gourmet Bistro"}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-white leading-[1.1] tracking-tight mt-2">
            Crafting Culinary <br />
            <span className="text-[#C6FF2E]">Moments.</span>
          </h1>
          
          <p className="text-xs sm:text-sm font-playwrite text-zinc-300 leading-relaxed max-w-[420px]">
            "Culinary Excellence in Every Dish, Crafted with Passion."
          </p>

          {/* Restaurant Motive Story Card */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 mt-2 backdrop-blur-md max-w-[460px] text-center shadow-2xl">
            <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#C6FF2E] mb-2">Our Culinary Motive</h2>
            <p className="text-zinc-350 text-xs font-semibold leading-relaxed">
              At {restaurantInfo?.name || "Gourmet Bistro"}, we believe dining is more than just food—it is an art form. Our chefs select local, sustainable organic harvests to craft plates that inspire. Every texture, aroma, and presentation is designed to create a timeless sensory memory.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 mt-4 w-full">
            <div className="bg-white/10 border border-white/10 px-5 py-2 rounded-full font-extrabold text-[10px] tracking-widest uppercase text-white backdrop-blur-sm">
              Table {currentTable}
            </div>
            
            <button
              onClick={() => setLandingExplored(true)}
              className="flex items-center justify-center gap-2 bg-[#C6FF2E] hover:bg-[#b5ee22] text-[#111111] font-extrabold py-4 px-8 w-full max-w-[280px] rounded-2xl shadow-lg shadow-[#C6FF2E]/10 hover:scale-[1.02] active:scale-98 transition-all duration-300 group cursor-pointer text-xs uppercase tracking-wider"
            >
              <span>Explore Today's Menu</span>
              <ArrowRight className="w-4 h-4 text-[#111111] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9] text-[#111111] font-sans pb-28">
      {/* Sticky Header Bar */}
      <header className="sticky top-0 bg-white/95 border-b border-[#ECECEC] py-4 px-6 flex justify-between items-center z-40 shadow-sm backdrop-blur-sm">
        {renderBranding(false)}
        <div className="bg-[#111111] text-white px-4 py-2 rounded-xl font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF2E] animate-pulse"></span>
          <span>Table {currentTable}</span>
        </div>
      </header>

      {/* Main Core Layout */}
      <main className="max-w-[800px] mx-auto px-4 sm:px-6 py-6">
        
        {/* Promotional Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden mb-6 shadow-sm border border-[#ECECEC] bg-zinc-950 text-white min-h-[200px] sm:min-h-[240px] flex items-center">
          {/* Background image overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-35 hover:scale-105 transition-transform duration-[4000ms] ease-out"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000&q=80')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
          
          <div className="relative z-10 p-6 sm:p-8 max-w-md flex flex-col items-start gap-1">
            <div className="flex items-center gap-1 bg-[#C6FF2E]/20 text-[#C6FF2E] border border-[#C6FF2E]/30 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-widest uppercase mb-1">
              <Flame className="w-3 h-3 text-[#C6FF2E]" />
              <span>Tabletop Special</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
              Order Instantly & Dine
            </h2>
            <p className="text-xs text-zinc-350 leading-relaxed font-semibold max-w-sm mt-0.5">
              Add products, submit directly, and watch order preparation live from your table.
            </p>
            <div className="mt-2.5 flex items-center gap-1.5 text-[#C6FF2E] text-[11px] font-extrabold">
              <span>✨</span>
              <span>10% Instant discount on premium products!</span>
            </div>
          </div>
        </div>

        {/* Restaurant Information Details Card */}
        <div className="bg-white border border-[#ECECEC] rounded-3xl p-5 mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            {restaurantInfo?.logo_url ? (
              <img 
                src={restaurantInfo.logo_url} 
                alt={restaurantInfo.name} 
                className="w-14 h-14 rounded-2xl object-contain border border-[#ECECEC] p-1 bg-white shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-[#C6FF2E] font-black text-xl border border-[#ECECEC] shadow-sm">
                {restaurantInfo?.name?.charAt(0) || 'G'}
              </div>
            )}
            <div>
              <h1 className="text-lg font-black text-[#111111] leading-tight">
                {restaurantInfo?.name || "Gourmet Bistro"}
              </h1>
              <p className="text-xs text-[#666666] font-semibold mt-1 flex flex-wrap items-center gap-1.5">
                <span>🥗 Appetizers, Mains & Sweets</span>
                <span className="text-zinc-300">•</span>
                <span>🕒 Average wait: 15 mins</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="flex items-center gap-1 bg-[#F8F8F8] border border-[#ECECEC] px-3 py-1.5 rounded-xl text-xs font-extrabold text-[#111111]">
              <span className="text-[#E63946]">★</span>
              <span>4.9</span>
              <span className="text-[#666666] font-normal text-[10px] ml-0.5">(120+)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl text-xs font-extrabold tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Open Now</span>
            </div>
          </div>
        </div>

        {/* Inline Search Bar */}
        <div className="relative w-full mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-zinc-400" />
          </div>
          <input
            type="text"
            placeholder="Search appetizers, steaks, burgers, desserts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-12 py-3.5 bg-white border border-[#ECECEC] rounded-2xl text-xs font-semibold text-[#111111] placeholder-zinc-450 focus:outline-none focus:border-zinc-800 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.005)]"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[10px] font-extrabold text-[#E63946] uppercase tracking-wider hover:text-rose-600 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Horizontal Category Nav */}
        <div className="mb-8">
          <div className="flex items-center gap-1.5 mb-3">
            <Compass className="w-4 h-4 text-[#666666]" />
            <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-[#666666]">
              Browse Categories
            </h2>
          </div>
          <nav className="flex gap-3 overflow-x-auto py-1.5 scrollbar-none -mx-4 px-4 sm:-mx-6 sm:px-6">
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

              const isActive = category === catId;

              return (
                <button
                  key={catId}
                  onClick={() => setCategory(catId)}
                  className={`flex flex-col items-center justify-center w-20 h-20 sm:w-22 sm:h-22 rounded-2xl transition-all duration-300 border shrink-0 focus:outline-none cursor-pointer ${
                    isActive
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg shadow-zinc-900/10 -translate-y-0.5'
                      : 'bg-white border-[#ECECEC] text-[#111111] hover:border-zinc-350 shadow-[0_4px_12px_rgba(0,0,0,0.01)]'
                  }`}
                >
                  <span className="text-2xl mb-1 select-none">{icon}</span>
                  <span className={`text-[9px] font-extrabold uppercase tracking-wider truncate max-w-[70px] ${isActive ? 'text-[#C6FF2E]' : 'text-[#666666]'}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Recommended For You Section */}
        {menuData.length > 0 && !searchTerm && category === 'all' && (
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-black text-[#111111] tracking-tight flex items-center gap-1.5">
                <span>✨</span> Recommended For You
              </h2>
              <span className="text-[9px] font-extrabold bg-[#E63946]/10 text-[#E63946] border border-[#E63946]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Chef's Picks
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menuData.slice(0, 2).map(item => {
                const quantity = cart[item.id] || 0;
                const rating = ((item.id.charCodeAt(0) % 5) * 0.1 + 4.5).toFixed(1);
                return (
                  <div 
                    key={`rec-${item.id}`} 
                    className="bg-white border border-[#ECECEC] rounded-3xl p-4 flex gap-4 items-center shadow-[0_8px_30px_rgb(0,0,0,0.005)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.02)] transition-all duration-300"
                  >
                    {/* Image Container */}
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-[#ECECEC] bg-slate-50">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";
                        }}
                      />
                      <span className="absolute top-1 left-1 bg-[#C6FF2E] text-[#111111] text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-wider shadow-sm">
                        TOP
                      </span>
                    </div>
                    
                    {/* Content Area */}
                    <div className="flex-grow flex flex-col justify-between h-20 py-0.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-extrabold text-[#E63946] uppercase tracking-wider">{item.category}</span>
                          <span className="text-zinc-300 text-[6px]">•</span>
                          <div className="flex items-center gap-0.5 text-[#E63946] text-[9px] font-bold">
                            <span>★</span>
                            <span>{rating}</span>
                          </div>
                        </div>
                        <h3 className="font-extrabold text-xs text-[#111111] line-clamp-1 mt-0.5">
                          {item.name}
                        </h3>
                        <p className="text-[10px] text-[#666666] line-clamp-1 leading-normal font-medium">
                          {item.description}
                        </p>
                      </div>
                      
                      {/* Price and Add Buttons */}
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs font-black text-[#111111]">
                          Rs {item.price.toFixed(2)}
                        </span>
                        
                        <div className="h-7.5 w-20">
                          {quantity > 0 ? (
                            <div className="flex items-center justify-between w-full h-full border-2 border-[#111111] bg-white rounded-lg overflow-hidden animate-pop-in">
                              <button
                                onClick={() => handleQuantityChange(item.id, -1)}
                                className="w-7 h-full flex items-center justify-center text-[#111111] font-extrabold text-xs hover:bg-zinc-55 active:scale-90 transition-all cursor-pointer"
                              >
                                −
                              </button>
                              <span className="font-extrabold text-[#111111] text-[10px]">
                                {quantity}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(item.id, 1)}
                                className="w-7 h-full flex items-center justify-center text-[#111111] font-extrabold text-xs hover:bg-zinc-55 active:scale-90 transition-all cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleQuantityChange(item.id, 1)}
                              className="w-full h-full bg-[#111111] hover:bg-zinc-900 text-white font-extrabold text-[10px] rounded-lg shadow-sm hover:scale-[1.02] active:scale-98 transition-all duration-200 cursor-pointer"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Menu Title Grid Header */}
        <div className="flex items-center gap-1.5 mb-4">
          <Compass className="w-4 h-4 text-[#666666]" />
          <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-[#666666]">
            {category === 'all' ? "Full Menu" : `${category} items`}
          </h2>
        </div>

        {/* Menu Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMenu.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white border border-[#ECECEC] rounded-3xl p-8 shadow-sm">
              <span className="text-3xl">🔍</span>
              <h3 className="font-extrabold text-[#111111] text-sm mt-3">No matching items found</h3>
              <p className="text-[#666666] text-xs max-w-xs mx-auto mt-1 font-medium">
                Try typing a different keyword or browsing another food category.
              </p>
            </div>
          ) : (
            filteredMenu.map(item => (
              <FoodCategoryCard
                key={item.id}
                item={item}
                quantity={cart[item.id] || 0}
                onQtyChange={handleQuantityChange}
              />
            ))
          )}
        </section>
      </main>

      {/* Floating Cart Bar summary */}
      {count > 0 && !activeOrderId && (
        <div
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[480px] bg-zinc-950 text-white flex justify-between items-center py-4 px-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:scale-98 transition-all cursor-pointer z-50 border border-zinc-850 animate-pop-in"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#C6FF2E]" />
              <span className="absolute -top-1.5 -right-1.5 bg-[#E63946] text-white font-extrabold text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-950 animate-bounce">{count}</span>
            </div>
            <div className="text-left">
              <span className="block font-bold text-xs uppercase tracking-wider text-zinc-400">Your Basket</span>
              <span className="text-[11px] text-zinc-400 font-semibold">{count} {count === 1 ? 'item' : 'items'} ready to order</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-base text-[#C6FF2E]">Rs {total.toFixed(2)}</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* Side Cart Drawer Overlay */}
      {isCartOpen && (
        <div
          onClick={() => setIsCartOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-[440px] h-full shadow-2xl flex flex-col animate-[slideLeft_0.3s_cubic-bezier(0.16,_1,_0.3,_1)]"
          >
            {/* Drawer Header */}
            <div className="flex justify-between items-center p-6 border-b border-[#ECECEC]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#111111]" />
                <h2 className="text-lg font-black text-[#111111]">Your Basket</h2>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)} 
                className="w-8 h-8 rounded-full bg-zinc-50 border border-[#ECECEC] flex items-center justify-center text-zinc-450 hover:text-[#111111] hover:border-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
              {Object.keys(cart).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <span className="text-4xl">🧺</span>
                  <p className="text-[#666666] font-semibold text-sm">Your basket is empty</p>
                  <p className="text-zinc-400 text-xs max-w-xs leading-normal">Browse our menu and add items to begin ordering straight to your table!</p>
                </div>
              ) : (
                Object.keys(cart).map(id => {
                  const item = menuData.find(m => m.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="flex justify-between items-center bg-[#F8F8F8] border border-[#ECECEC] p-4 rounded-2xl animate-fade-in">
                      <div className="flex flex-col pr-2">
                        <span className="font-extrabold text-sm text-[#111111] line-clamp-1">{item.name}</span>
                        <span className="text-xs text-[#E63946] font-extrabold mt-0.5">Rs {item.price.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-3 bg-white border border-[#ECECEC] px-3 py-1.5 rounded-xl shadow-sm shrink-0">
                        <button 
                          onClick={() => handleQuantityChange(id, -1)} 
                          className="text-zinc-400 hover:text-[#E63946] font-extrabold text-sm transition-colors cursor-pointer"
                        >
                          −
                        </button>
                        <span className="font-extrabold text-xs text-[#111111] min-w-[14px] text-center">{cart[id]}</span>
                        <button 
                          onClick={() => handleQuantityChange(id, 1)} 
                          className="text-zinc-400 hover:text-zinc-950 font-extrabold text-sm transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer with calculation breakdown */}
            {Object.keys(cart).length > 0 && (
              <div className="p-6 border-t border-[#ECECEC] bg-[#F8F8F8]">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs font-semibold text-[#666666]">
                    <span>Subtotal</span>
                    <span>Rs {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-[#666666]">
                    <span>VAT & Tax (8%)</span>
                    <span>Rs {tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-[#666666]">
                    <span>Service Charge (5%)</span>
                    <span>Rs {service.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[#ECECEC] my-2"></div>
                  <div className="flex justify-between text-base font-extrabold text-[#111111]">
                    <span>Grand Total</span>
                    <span>Rs {total.toFixed(2)}</span>
                  </div>
                </div>
                
                <button
                  onClick={handlePlaceOrder}
                  className="w-full bg-[#111111] hover:bg-zinc-900 text-white font-extrabold py-4 rounded-2xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer group text-xs uppercase tracking-wider"
                >
                  <span>Place Order</span>
                  <ArrowRight className="w-4 h-4 text-[#C6FF2E] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stepper Status Tracking Modal Overlay */}
      {activeOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-white text-charcoal w-full max-w-[480px] border border-[#ECECEC] p-6 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-[scaleUp_0.3s_ease-out]">
            <div className="flex items-center gap-3 border-b border-[#ECECEC] pb-4 mb-6">
              <span className="pulse-indicator"></span>
              <h2 className="text-base font-extrabold text-[#111111] flex-grow">Track Your Order</h2>
              <span className="bg-[#F8F8F8] border border-[#ECECEC] text-[#111111] font-mono text-[10px] font-bold px-3 py-1 rounded-xl">ID: {activeOrder.id.slice(0, 8)}</span>
            </div>

            {/* Stepper Graphics Timeline */}
            <div className="flex flex-col gap-5 mb-8 relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-100">
              {[
                { id: 'pending', title: 'Order Placed', desc: 'Sent to the kitchen, waiting for review' },
                { id: 'confirmed', title: 'Confirmed', desc: 'Accepted and queued' },
                { id: 'cooking', title: 'Preparing', desc: 'Chef is crafting your meal' },
                { id: 'ready', title: 'Ready', desc: 'On its way to your table' },
                { id: 'completed', title: 'Served', desc: 'Enjoy your fresh meal!' }
              ].map((step, idx) => {
                const stepsList = ['pending', 'confirmed', 'cooking', 'ready', 'completed'];
                const currentIdx = stepsList.indexOf(activeOrder.status);
                const isCompleted = idx < currentIdx;
                const isActive = idx === currentIdx;

                return (
                  <div 
                    key={step.id} 
                    className={`relative flex gap-4 items-start transition-all duration-300 ${
                      isActive ? 'opacity-100 scale-[1.01]' : isCompleted ? 'opacity-90' : 'opacity-35'
                    }`}
                  >
                    {/* Circle timeline Indicator */}
                    <div className={`absolute -left-[21px] w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border-2 z-10 transition-colors ${
                      isCompleted 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : isActive 
                          ? 'bg-[#111111] border-[#111111] text-[#C6FF2E]' 
                          : 'bg-white border-zinc-200 text-zinc-400'
                    }`}>
                      {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : idx + 1}
                    </div>
                    
                    <div className="pl-2">
                      <div className={`font-extrabold text-sm ${isActive ? 'text-[#111111]' : 'text-zinc-650'}`}>
                        {step.title}
                      </div>
                      <div className="text-[#666666] text-[11px] font-semibold mt-0.5">{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mini invoice summary */}
            <div className="bg-[#F8F8F8] border border-[#ECECEC] p-5 rounded-2xl mb-6">
              <h3 className="font-extrabold text-xs text-[#111111] uppercase tracking-wider mb-3">Order Details</h3>
              <ul className="flex flex-col gap-2.5">
                {activeOrder.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-xs font-semibold text-[#666666]">
                    <span>{item.name} <span className="text-[#E63946] font-extrabold">x{item.quantity}</span></span>
                    <span>Rs {(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-[#ECECEC] my-4"></div>
              <div className="flex justify-between font-extrabold text-sm text-[#111111]">
                <span>Grand Total</span>
                <span>Rs {activeOrder.billing.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-[11px] text-[#666666] leading-relaxed">
                You can browse the menu or add more items. We'll alert you here when your order status updates.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveOrder(null)} // hide overlay locally
                  className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-charcoal font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
