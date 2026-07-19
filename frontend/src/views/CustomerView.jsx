import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { realTimeSync } from "../utils/socket";
import { API_URL } from "../utils/config";
import {
  Search,
  ShoppingBag,
  X,
  Check,
  ArrowRight,
  QrCode,
} from "lucide-react";

const BACKEND_URL = API_URL;

export function FoodCategoryCard({ item, quantity, onQtyChange }) {
  return (
    <div className="group bg-white border border-[#EAEAEA] rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300 hover:border-[#D5D5D5] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
      {/* Food Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#F5F5F5]">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          onError={(e) => {
            e.target.src =
              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";
          }}
        />
      </div>

      {/* Card Details */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-sm font-semibold text-[#111111] tracking-tight leading-snug line-clamp-1">
          {item.name}
        </h3>

        <div className="flex items-center justify-between mt-3">
          <span className="text-sm font-bold text-[#111111]">
            Rs {item.price.toFixed(2)}
          </span>

          <div className="h-8 shrink-0">
            {quantity > 0 ? (
              <div className="flex items-center justify-between w-24 h-full border border-[#111111] bg-white rounded-lg overflow-hidden">
                <button
                  onClick={() => onQtyChange(item.id, -1)}
                  className="w-8 h-full flex items-center justify-center text-[#111111] font-medium text-sm hover:bg-[#F5F5F5] active:scale-90 transition-all cursor-pointer"
                >
                  −
                </button>
                <span className="font-semibold text-[#111111] text-xs">
                  {quantity}
                </span>
                <button
                  onClick={() => onQtyChange(item.id, 1)}
                  className="w-8 h-full flex items-center justify-center text-[#111111] font-medium text-sm hover:bg-[#F5F5F5] active:scale-90 transition-all cursor-pointer"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={() => onQtyChange(item.id, 1)}
                className="h-full px-4 bg-[#111111] hover:bg-[#000000] text-white font-semibold text-xs rounded-lg transition-all cursor-pointer"
              >
                Add
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
  const [category, setCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState({}); // { itemId: quantity }
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showDemoTableOverlay, setShowDemoTableOverlay] = useState(false);
  const [selectedDemoTable, setSelectedDemoTable] = useState("1");

  // Detect table and load initial orders/menu
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let table = urlParams.get("table");

    // Parse dynamic restaurant slug from path prefix (e.g. /r/kfc/customer)
    const pathMatch = window.location.pathname.match(/^\/r\/([^/]+)/);
    const pathSlug = pathMatch ? pathMatch[1] : null;

    let restId = pathSlug || urlParams.get("restaurant");

    if (!table) {
      table = localStorage.getItem("ordering_table");
    }
    if (!restId) {
      restId = localStorage.getItem("ordering_restaurant");
    }

    if (restId) {
      setRestaurantId(restId);
      localStorage.setItem("ordering_restaurant", restId);
    }

    if (table) {
      setCurrentTable(table);
      localStorage.setItem("ordering_table", table);
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
      realTimeSync.registerRestaurant(restaurantId, "customer");
    }
  }, [restaurantId]);

  // WebSockets updates for active tracking orders
  useEffect(() => {
    const onUpdated = realTimeSync.on("ORDER_UPDATED", (payload) => {
      const updatedOrder = payload.order;
      if (updatedOrder && activeOrderId && updatedOrder.id === activeOrderId) {
        setActiveOrder(updatedOrder);
        // Play bell alert if status changes
        if (activeOrder && activeOrder.status !== updatedOrder.status) {
          playAudioAlert();
        }
        // If order was cancelled or completed, clean active order local states
        if (
          updatedOrder.status === "completed" ||
          updatedOrder.status === "cancelled"
        ) {
          localStorage.removeItem(`active_order_table_${currentTable}`);
          setActiveOrderId(null);
          setActiveOrder(null);
        }
      }
    });

    return () => {
      realTimeSync.off("ORDER_UPDATED", onUpdated);
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
      console.error("Menu load error:", err);
    }
  };

  const loadRestaurantInfo = async (slug) => {
    if (!slug) return;
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/v1/restaurants/public/${slug}`,
      );
      const result = await res.json();
      if (result.success) {
        setRestaurantInfo(result.data);
      }
    } catch (err) {
      console.error("Restaurant info load error:", err);
    }
  };

  const renderBranding = (isLanding = false) => {
    if (restaurantInfo) {
      return (
        <div className="flex items-center gap-3 justify-center">
          {restaurantInfo.logo_url && (
            <img
              src={restaurantInfo.logo_url}
              className={`${isLanding ? "h-14 sm:h-16" : "h-8 sm:h-9"} w-auto object-contain rounded-lg`}
              alt={restaurantInfo.name}
            />
          )}
          <span
            className={`${isLanding ? "text-3xl sm:text-4xl" : "text-lg sm:text-xl"} font-bold text-[#111111]`}
          >
            {restaurantInfo.name}
          </span>
        </div>
      );
    }
    return (
      <div
        className={`font-semibold tracking-tight text-[#111111] ${isLanding ? "text-3xl sm:text-4xl" : "text-xl"}`}
      >
        Gourmet Bistro
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
    localStorage.setItem("ordering_table", selectedDemoTable);
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
      const audio = new Audio(
        "https://assets.mixkit.co/active_storage/sfx/911/911-84.wav",
      );
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Cart math
  const getCartTotals = () => {
    let subtotal = 0;
    let count = 0;

    Object.keys(cart).forEach((id) => {
      const item = menuData.find((m) => m.id === id);
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
    const itemsArray = Object.keys(cart).map((id) => ({
      id,
      quantity: cart[id],
    }));

    if (itemsArray.length === 0) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: currentTable,
          items: itemsArray,
          restaurant_id: restaurantId,
        }),
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
  const filteredMenu = menuData.filter((item) => {
    const matchesCategory = category === "all" || item.category === category;
    const matchesSearch =
      searchTerm === "" ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.category &&
        item.category.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Table selector overlay when table URL parameter is missing
  if (showDemoTableOverlay) {
    return (
      <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center p-6">
        <div className="bg-white text-[#111111] w-full max-w-sm p-8 rounded-2xl text-center border border-[#EAEAEA]">
          <div className="w-12 h-12 border border-[#EAEAEA] rounded-xl flex items-center justify-center mx-auto mb-5">
            <QrCode className="w-6 h-6 text-[#111111]" />
          </div>
          <h2 className="text-lg font-semibold mb-2 text-[#111111]">
            Table QR Required
          </h2>
          <p className="text-[#777777] text-xs leading-relaxed mb-6 max-w-xs mx-auto">
            Please scan the QR code at your table. Or select a demo table number
            below to test ordering.
          </p>
          <div className="mb-6">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777777] text-left mb-2 pl-1">
              Select Demo Table
            </label>
            <select
              value={selectedDemoTable}
              onChange={(e) => setSelectedDemoTable(e.target.value)}
              className="w-full p-3 bg-white border border-[#EAEAEA] rounded-xl text-[#111111] text-sm font-medium focus:border-[#111111] outline-none cursor-pointer"
            >
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  Table {i + 1}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleDemoTableSubmit}
            className="w-full py-3.5 bg-[#111111] hover:bg-black text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Start Ordering
          </button>
        </div>
      </div>
    );
  }

  // Welcome page screen (first scan entry) — clean, no background image
  if (!landingExplored) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-white text-[#111111] px-6">
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-6">
          {/* Logo / Brand */}
          {restaurantInfo?.logo_url ? (
            <img
              src={restaurantInfo.logo_url}
              className="h-16 w-16 object-contain"
              alt={restaurantInfo.name}
            />
          ) : null}

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
              {restaurantInfo?.name || "Gourmet Bistro"}
            </h1>
            <p className="text-sm text-[#777777]">Fresh food, made to order.</p>
          </div>

          <div className="text-[11px] font-medium uppercase tracking-wider text-[#999999] border border-[#EAEAEA] rounded-full px-4 py-1.5">
            Table {currentTable}
          </div>

          <button
            onClick={() => setLandingExplored(true)}
            className="flex items-center justify-center gap-2 bg-[#111111] hover:bg-black text-white font-semibold py-3.5 px-8 w-full rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
          >
            <span>Continue to Menu</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans pb-28">
      {/* Sticky Header Bar */}
      <header className="sticky top-0 bg-white/95 border-b border-[#EAEAEA] py-4 px-6 flex justify-between items-center z-40 backdrop-blur-sm">
        {renderBranding(false)}
        <div className="border border-[#EAEAEA] text-[#111111] px-3.5 py-1.5 rounded-lg font-semibold text-[10px] tracking-wider uppercase">
          Table {currentTable}
        </div>
      </header>

      {/* Main Core Layout */}
      <main className="max-w-[800px] mx-auto px-4 sm:px-6 py-6">
        {/* Inline Search Bar */}
        <div className="relative w-full mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#AAAAAA]" />
          </div>
          <input
            type="text"
            placeholder="Search the menu"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-12 py-3.5 bg-white border border-[#EAEAEA] rounded-xl text-sm text-[#111111] placeholder-[#AAAAAA] focus:outline-none focus:border-[#111111] transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-[10px] font-semibold text-[#777777] uppercase tracking-wider hover:text-[#111111] cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Horizontal Category Nav */}
        <div className="mb-8">
          <nav className="flex gap-2 overflow-x-auto py-1 scrollbar-none -mx-4 px-4 sm:-mx-6 sm:px-6">
            {Array.from(
              new Set([
                "all",
                ...Array.from(
                  new Set(
                    menuData.map((item) => item.category).filter(Boolean),
                  ),
                ),
              ]),
            ).map((catId) => {
              const label =
                catId === "all"
                  ? "All"
                  : catId.charAt(0).toUpperCase() + catId.slice(1);
              const isActive = category === catId;

              return (
                <button
                  key={catId}
                  onClick={() => setCategory(catId)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border shrink-0 focus:outline-none cursor-pointer ${
                    isActive
                      ? "bg-[#111111] border-[#111111] text-white"
                      : "bg-white border-[#EAEAEA] text-[#555555] hover:border-[#CCCCCC]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Menu Cards Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {filteredMenu.length === 0 ? (
            <div className="col-span-full py-16 text-center border border-[#EAEAEA] rounded-2xl p-8">
              <h3 className="font-semibold text-[#111111] text-sm">
                No matching items found
              </h3>
              <p className="text-[#777777] text-xs max-w-xs mx-auto mt-1">
                Try a different keyword or category.
              </p>
            </div>
          ) : (
            filteredMenu.map((item) => (
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
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[480px] bg-[#111111] text-white flex justify-between items-center py-4 px-6 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 active:scale-98 transition-all cursor-pointer z-50"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-4.5 h-4.5 text-white" />
              <span className="absolute -top-1.5 -right-1.5 bg-white text-[#111111] font-bold text-[9px] w-5 h-5 rounded-full flex items-center justify-center">
                {count}
              </span>
            </div>
            <div className="text-left">
              <span className="block font-semibold text-xs">Your Basket</span>
              <span className="text-[11px] text-white/60">
                {count} {count === 1 ? "item" : "items"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm">Rs {total.toFixed(2)}</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      {/* Side Cart Drawer Overlay */}
      {isCartOpen && (
        <div
          onClick={() => setIsCartOpen(false)}
          className="fixed inset-0 bg-black/40 z-50 flex justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-[440px] h-full shadow-2xl flex flex-col"
          >
            {/* Drawer Header */}
            <div className="flex justify-between items-center p-6 border-b border-[#EAEAEA]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#111111]" />
                <h2 className="text-lg font-bold text-[#111111]">
                  Your Basket
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full border border-[#EAEAEA] flex items-center justify-center text-[#777777] hover:text-[#111111] hover:border-[#CCCCCC] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-3">
              {Object.keys(cart).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
                  <p className="text-[#777777] font-semibold text-sm">
                    Your basket is empty
                  </p>
                  <p className="text-[#AAAAAA] text-xs max-w-xs leading-normal">
                    Browse the menu and add items to order to your table.
                  </p>
                </div>
              ) : (
                Object.keys(cart).map((id) => {
                  const item = menuData.find((m) => m.id === id);
                  if (!item) return null;
                  return (
                    <div
                      key={id}
                      className="flex justify-between items-center border border-[#EAEAEA] p-4 rounded-xl"
                    >
                      <div className="flex flex-col pr-2">
                        <span className="font-semibold text-sm text-[#111111] line-clamp-1">
                          {item.name}
                        </span>
                        <span className="text-xs text-[#777777] mt-0.5">
                          Rs {item.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 border border-[#EAEAEA] px-3 py-1.5 rounded-lg shrink-0">
                        <button
                          onClick={() => handleQuantityChange(id, -1)}
                          className="text-[#777777] hover:text-[#111111] font-semibold text-sm transition-colors cursor-pointer"
                        >
                          −
                        </button>
                        <span className="font-semibold text-xs text-[#111111] min-w-[14px] text-center">
                          {cart[id]}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(id, 1)}
                          className="text-[#777777] hover:text-[#111111] font-semibold text-sm transition-colors cursor-pointer"
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
              <div className="p-6 border-t border-[#EAEAEA]">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs text-[#777777]">
                    <span>Subtotal</span>
                    <span>Rs {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#777777]">
                    <span>Tax (8%)</span>
                    <span>Rs {tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#777777]">
                    <span>Service Charge (5%)</span>
                    <span>Rs {service.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[#EAEAEA] my-2"></div>
                  <div className="flex justify-between text-base font-bold text-[#111111]">
                    <span>Total</span>
                    <span>Rs {total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  className="w-full bg-[#111111] hover:bg-black text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                >
                  <span>Place Order</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stepper Status Tracking Modal Overlay */}
      {activeOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-5">
          <div className="bg-white text-[#111111] w-full max-w-[480px] border border-[#EAEAEA] p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 border-b border-[#EAEAEA] pb-4 mb-6">
              <h2 className="text-base font-bold text-[#111111] flex-grow">
                Track Your Order
              </h2>
              <span className="border border-[#EAEAEA] text-[#777777] font-mono text-[10px] font-semibold px-3 py-1 rounded-lg">
                ID: {activeOrder.id.slice(0, 8)}
              </span>
            </div>

            {/* Stepper Graphics Timeline */}
            <div className="flex flex-col gap-5 mb-8 relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#EEEEEE]">
              {[
                {
                  id: "pending",
                  title: "Order Placed",
                  desc: "Sent to the kitchen, waiting for review",
                },
                {
                  id: "confirmed",
                  title: "Confirmed",
                  desc: "Accepted and queued",
                },
                {
                  id: "cooking",
                  title: "Preparing",
                  desc: "Chef is crafting your meal",
                },
                {
                  id: "ready",
                  title: "Ready",
                  desc: "On its way to your table",
                },
                { id: "completed", title: "Served", desc: "Enjoy your meal" },
              ].map((step, idx) => {
                const stepsList = [
                  "pending",
                  "confirmed",
                  "cooking",
                  "ready",
                  "completed",
                ];
                const currentIdx = stepsList.indexOf(activeOrder.status);
                const isCompleted = idx < currentIdx;
                const isActive = idx === currentIdx;

                return (
                  <div
                    key={step.id}
                    className={`relative flex gap-4 items-start transition-all duration-300 ${
                      isActive
                        ? "opacity-100"
                        : isCompleted
                          ? "opacity-80"
                          : "opacity-35"
                    }`}
                  >
                    {/* Circle timeline Indicator */}
                    <div
                      className={`absolute -left-[21px] w-6 h-6 rounded-full font-semibold text-xs flex items-center justify-center shrink-0 border-2 z-10 transition-colors bg-white ${
                        isCompleted
                          ? "border-[#111111] text-[#111111]"
                          : isActive
                            ? "bg-[#111111] border-[#111111] text-white"
                            : "border-[#DDDDDD] text-[#AAAAAA]"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <div className="pl-2">
                      <div
                        className={`font-semibold text-sm ${isActive ? "text-[#111111]" : "text-[#555555]"}`}
                      >
                        {step.title}
                      </div>
                      <div className="text-[#777777] text-[11px] mt-0.5">
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mini invoice summary */}
            <div className="border border-[#EAEAEA] p-5 rounded-xl mb-6">
              <h3 className="font-semibold text-xs text-[#111111] uppercase tracking-wider mb-3">
                Order Details
              </h3>
              <ul className="flex flex-col gap-2.5">
                {activeOrder.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex justify-between text-xs text-[#777777]"
                  >
                    <span>
                      {item.name}{" "}
                      <span className="text-[#111111] font-semibold">
                        x{item.quantity}
                      </span>
                    </span>
                    <span>Rs {(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-[#EAEAEA] my-4"></div>
              <div className="flex justify-between font-bold text-sm text-[#111111]">
                <span>Total</span>
                <span>Rs {activeOrder.billing.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-[11px] text-[#777777] leading-relaxed">
                You can browse the menu or add more items. We'll update this
                page when your order status changes.
              </p>
              <button
                onClick={() => setActiveOrder(null)} // hide overlay locally
                className="w-full py-3 border border-[#EAEAEA] hover:border-[#CCCCCC] text-[#111111] font-semibold rounded-xl transition-colors cursor-pointer"
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
