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
  Plus,
  Minus,
} from "lucide-react";

const BACKEND_URL = API_URL;

// Design tokens — kept in one place so the whole file stays consistent
const INK = "#171512";
const MUTED = "#8A8580";
const LINE = "#EBE7E0";
const WINE = "#7A2331";
const SERIF = { fontFamily: "'Fraunces', ui-serif, Georgia, serif" };
const SANS = { fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" };

// Loads the two type families once per screen. Inject at the root of each
// returned tree (component has a few early returns for different screens).
function FontImport() {
  return (
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');`}</style>
  );
}

export function FoodCategoryCard({ item, quantity, onQtyChange }) {
  return (
    <div className="group flex flex-col" style={SANS}>
      {/* Photo, with a floating add control living on top of it */}
      <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-[#F4F2EE]">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          onError={(e) => {
            e.target.src =
              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";
          }}
        />
        <div className="absolute bottom-2.5 right-2.5">
          {quantity > 0 ? (
            <div className="flex items-center gap-2 bg-[#171512] text-white rounded-full pl-1 pr-1 py-1 shadow-[0_4px_14px_rgba(0,0,0,0.25)]">
              <button
                onClick={() => onQtyChange(item.id, -1)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/15 active:scale-90 transition-all cursor-pointer"
              >
                <Minus className="w-3 h-3" strokeWidth={2.5} />
              </button>
              <span className="text-xs font-semibold min-w-[10px] text-center">
                {quantity}
              </span>
              <button
                onClick={() => onQtyChange(item.id, 1)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/15 active:scale-90 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onQtyChange(item.id, 1)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[#171512] shadow-[0_4px_14px_rgba(0,0,0,0.2)] hover:scale-110 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Name + price */}
      <div className="pt-3">
        <h3
          className="text-[15px] leading-snug text-[#171512] line-clamp-1"
          style={SERIF}
        >
          {item.name}
        </h3>
        <span className="text-sm italic" style={{ ...SERIF, color: WINE }}>
          Rs {item.price.toFixed(2)}
        </span>
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
  // Shown after seller settles the bill
  const [showPaidScreen, setShowPaidScreen] = useState(false);

  // Detect table and load initial orders/menu
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    // Parse dynamic restaurant slug from path prefix (e.g. /r/kfc/customer)
    const pathMatch = window.location.pathname.match(/^\/r\/([^/]+)/);
    const pathSlug = pathMatch ? pathMatch[1] : null;

    let restId = pathSlug || urlParams.get("restaurant");

    // ── TABLE TAMPER-PROOF ──────────────────────────────────────────────────
    // Once a table is locked via a QR scan, localStorage is the single source
    // of truth. A manual URL edit cannot override an already-locked table.
    const lockedTable = localStorage.getItem("ordering_table");
    const urlTable = urlParams.get("table");
    const table = lockedTable || urlTable; // localStorage wins if set
    if (!lockedTable && urlTable) {
      // Fresh QR scan — lock the table for this session
      localStorage.setItem("ordering_table", urlTable);
    }
    // ────────────────────────────────────────────────────────────────────────

    if (!restId) {
      restId = localStorage.getItem("ordering_restaurant");
    }

    if (restId) {
      setRestaurantId(restId);
      localStorage.setItem("ordering_restaurant", restId);
    }

    if (table) {
      setCurrentTable(table);
      // Fetch order details for session tracking
      const savedOrderId = localStorage.getItem(`active_order_table_${table}`);
      if (savedOrderId) {
        setActiveOrderId(savedOrderId);
        // Bypass welcome screen immediately — customer has an active order
        setLandingExplored(true);
        fetchOrderDetails(savedOrderId, restId);
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
        // ── PAYMENT COMPLETE ─────────────────────────────────────────────────
        if (updatedOrder.status === "completed") {
          // Show the thank-you screen to the customer
          setShowPaidScreen(true);
          // After 5 seconds, wipe ALL session data and return to welcome screen
          setTimeout(() => {
            const tbl = localStorage.getItem("ordering_table");
            if (tbl) localStorage.removeItem(`active_order_table_${tbl}`);
            localStorage.removeItem("ordering_table");
            localStorage.removeItem("ordering_restaurant");
            setActiveOrderId(null);
            setActiveOrder(null);
            setShowPaidScreen(false);
            setCart({});
            // Hard reload to welcome screen — clears all state cleanly
            window.location.href = window.location.pathname;
          }, 5000);
        } else if (updatedOrder.status === "cancelled") {
          // Cancelled: clear order state but keep customer on the menu
          localStorage.removeItem(`active_order_table_${currentTable}`);
          setActiveOrderId(null);
          setActiveOrder(null);
        }
        // ─────────────────────────────────────────────────────────────────────
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

  const restaurantName = restaurantInfo?.name || "Gourmet Bistro";

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

  // When browsing "all" with no search, present the menu the way a printed
  // menu reads — grouped into named sections rather than one flat grid.
  const groupedMenu =
    category === "all" && !searchTerm
      ? filteredMenu.reduce((acc, item) => {
          const key = item.category || "Other";
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {})
      : null;

  // Table selector overlay when table URL parameter is missing
  if (showDemoTableOverlay) {
    return (
      <div
        className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center p-6"
        style={SANS}
      >
        <FontImport />
        <div
          className="bg-white text-[#171512] w-full max-w-sm p-8 rounded-2xl text-center border"
          style={{ borderColor: LINE }}
        >
          <div
            className="w-12 h-12 border rounded-xl flex items-center justify-center mx-auto mb-5"
            style={{ borderColor: LINE }}
          >
            <QrCode className="w-6 h-6 text-[#171512]" />
          </div>
          <h2 className="text-lg mb-2 text-[#171512]" style={SERIF}>
            Table QR Required
          </h2>
          <p
            className="text-xs leading-relaxed mb-6 max-w-xs mx-auto"
            style={{ color: MUTED }}
          >
            Please scan the QR code at your table. Or select a demo table number
            below to test ordering.
          </p>
          <div className="mb-6">
            <label
              className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-left mb-2 pl-1"
              style={{ color: MUTED }}
            >
              Select Demo Table
            </label>
            <select
              value={selectedDemoTable}
              onChange={(e) => setSelectedDemoTable(e.target.value)}
              className="w-full p-3 bg-white border rounded-xl text-[#171512] text-sm font-medium focus:outline-none cursor-pointer"
              style={{ borderColor: LINE }}
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
            className="w-full py-3.5 bg-[#171512] hover:bg-black text-white font-semibold text-xs uppercase tracking-[0.15em] rounded-full transition-all cursor-pointer"
          >
            Start Ordering
          </button>
        </div>
      </div>
    );
  }

  // Welcome screen — plain white, type-led, no photography
  if (!landingExplored) {
    return (
      <div
        className="flex flex-col justify-center items-center min-h-screen bg-white text-[#171512] px-6"
        style={SANS}
      >
        <FontImport />
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-7">
          {restaurantInfo?.logo_url ? (
            <img
              src={restaurantInfo.logo_url}
              className="h-14 w-14 object-contain"
              alt={restaurantName}
            />
          ) : null}

          <div className="flex flex-col gap-2.5">
            <span
              className="block text-[10px] font-semibold uppercase tracking-[0.3em]"
              style={{ color: WINE }}
            >
              Welcome
            </span>
            <h1
              className="text-4xl sm:text-5xl leading-[1.05] text-[#171512]"
              style={SERIF}
            >
              {restaurantName}
            </h1>
            <p
              className="text-base italic mt-1"
              style={{ ...SERIF, color: MUTED }}
            >
              Fresh food, made to order.
            </p>
          </div>

          <div className="w-10 h-px" style={{ backgroundColor: LINE }} />

          <div
            className="text-[11px] font-semibold uppercase tracking-[0.25em]"
            style={{ color: MUTED }}
          >
            Table {currentTable}
          </div>

          <button
            onClick={() => setLandingExplored(true)}
            className="group flex items-center justify-center gap-2 bg-[#171512] hover:bg-black text-white font-semibold py-3.5 px-8 w-full rounded-full transition-all cursor-pointer text-xs uppercase tracking-[0.15em]"
          >
            <span>View Menu</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#171512] pb-28" style={SANS}>
      <FontImport />

      {/* Sticky Header Bar */}
      <header
        className="sticky top-0 bg-white/95 border-b py-5 px-6 flex justify-between items-center z-40 backdrop-blur-sm"
        style={{ borderColor: LINE }}
      >
        <div className="flex items-center gap-3">
          {restaurantInfo?.logo_url && (
            <img
              src={restaurantInfo.logo_url}
              className="h-8 w-8 object-contain"
              alt={restaurantName}
            />
          )}
          <span className="text-xl text-[#171512]" style={SERIF}>
            {restaurantName}
          </span>
        </div>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.15em]"
          style={{ color: MUTED }}
        >
          Table {currentTable}
        </span>
      </header>

      {/* Main Core Layout */}
      <main className="max-w-[880px] mx-auto px-4 sm:px-6 py-8">
        {/* Underline search field */}
        <div
          className="relative w-full mb-9 border-b transition-colors"
          style={{ borderColor: searchTerm ? INK : LINE }}
        >
          <div className="flex items-center gap-3 py-3">
            <Search className="h-4 w-4 shrink-0" style={{ color: MUTED }} />
            <input
              type="text"
              placeholder="Search the menu"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow bg-transparent text-sm text-[#171512] placeholder-[#AAAAAA] focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-[10px] font-semibold uppercase tracking-wider hover:text-[#171512] cursor-pointer"
                style={{ color: MUTED }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Category tabs, underline-indicator style */}
        <nav
          className="flex gap-7 overflow-x-auto mb-11 border-b scrollbar-none -mx-4 px-4 sm:-mx-6 sm:px-6"
          style={{ borderColor: LINE }}
        >
          {Array.from(
            new Set([
              "all",
              ...Array.from(
                new Set(menuData.map((item) => item.category).filter(Boolean)),
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
                className="relative pb-3 text-xs font-semibold uppercase tracking-[0.1em] whitespace-nowrap transition-colors shrink-0 focus:outline-none cursor-pointer"
                style={{ color: isActive ? INK : MUTED }}
              >
                {label}
                {isActive && (
                  <span
                    className="absolute left-0 right-0 -bottom-px h-[2px]"
                    style={{ backgroundColor: WINE }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Menu — grouped into printed-menu style sections when browsing "All" */}
        {filteredMenu.length === 0 ? (
          <div
            className="py-16 text-center border rounded-2xl p-8"
            style={{ borderColor: LINE }}
          >
            <h3 className="text-base text-[#171512]" style={SERIF}>
              No matching items found
            </h3>
            <p
              className="text-xs max-w-xs mx-auto mt-1"
              style={{ color: MUTED }}
            >
              Try a different keyword or category.
            </p>
          </div>
        ) : groupedMenu ? (
          <div className="flex flex-col gap-12">
            {Object.entries(groupedMenu).map(([catName, items]) => (
              <div key={catName}>
                <div className="flex items-center gap-4 mb-5">
                  <h2 className="text-lg text-[#171512] shrink-0" style={SERIF}>
                    {catName.charAt(0).toUpperCase() + catName.slice(1)}
                  </h2>
                  <div
                    className="h-px flex-grow"
                    style={{ backgroundColor: LINE }}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-9">
                  {items.map((item) => (
                    <FoodCategoryCard
                      key={item.id}
                      item={item}
                      quantity={cart[item.id] || 0}
                      onQtyChange={handleQuantityChange}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-9">
            {filteredMenu.map((item) => (
              <FoodCategoryCard
                key={item.id}
                item={item}
                quantity={cart[item.id] || 0}
                onQtyChange={handleQuantityChange}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Cart Bar summary */}
      {count > 0 && !activeOrderId && (
        <div
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[480px] bg-[#171512] text-white flex justify-between items-center py-4 px-6 rounded-full shadow-[0_16px_40px_rgba(0,0,0,0.22)] hover:-translate-y-0.5 active:scale-98 transition-all cursor-pointer z-50"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-4.5 h-4.5 text-white" />
              <span className="absolute -top-1.5 -right-1.5 bg-white text-[#171512] font-bold text-[9px] w-5 h-5 rounded-full flex items-center justify-center">
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
            <span className="text-base italic" style={SERIF}>
              Rs {total.toFixed(2)}
            </span>
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
            <div
              className="flex justify-between items-center p-6 border-b"
              style={{ borderColor: LINE }}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[#171512]" />
                <h2 className="text-lg text-[#171512]" style={SERIF}>
                  Your Basket
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full border flex items-center justify-center hover:text-[#171512] transition-colors cursor-pointer"
                style={{ borderColor: LINE, color: MUTED }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-3">
              {Object.keys(cart).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
                  <p className="font-semibold text-sm" style={{ color: MUTED }}>
                    Your basket is empty
                  </p>
                  <p
                    className="text-xs max-w-xs leading-normal"
                    style={{ color: "#B5B0A9" }}
                  >
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
                      className="flex justify-between items-center border p-4 rounded-xl"
                      style={{ borderColor: LINE }}
                    >
                      <div className="flex flex-col pr-2">
                        <span className="font-semibold text-sm text-[#171512] line-clamp-1">
                          {item.name}
                        </span>
                        <span
                          className="text-xs italic mt-0.5"
                          style={{ ...SERIF, color: WINE }}
                        >
                          Rs {item.price.toFixed(2)}
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-3 border px-3 py-1.5 rounded-full shrink-0"
                        style={{ borderColor: LINE }}
                      >
                        <button
                          onClick={() => handleQuantityChange(id, -1)}
                          className="hover:text-[#171512] font-semibold text-sm transition-colors cursor-pointer"
                          style={{ color: MUTED }}
                        >
                          −
                        </button>
                        <span className="font-semibold text-xs text-[#171512] min-w-[14px] text-center">
                          {cart[id]}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(id, 1)}
                          className="hover:text-[#171512] font-semibold text-sm transition-colors cursor-pointer"
                          style={{ color: MUTED }}
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
              <div className="p-6 border-t" style={{ borderColor: LINE }}>
                <div className="space-y-2 mb-4">
                  <div
                    className="flex justify-between text-xs"
                    style={{ color: MUTED }}
                  >
                    <span>Subtotal</span>
                    <span>Rs {subtotal.toFixed(2)}</span>
                  </div>
                  <div
                    className="flex justify-between text-xs"
                    style={{ color: MUTED }}
                  >
                    <span>Tax (8%)</span>
                    <span>Rs {tax.toFixed(2)}</span>
                  </div>
                  <div
                    className="flex justify-between text-xs"
                    style={{ color: MUTED }}
                  >
                    <span>Service Charge (5%)</span>
                    <span>Rs {service.toFixed(2)}</span>
                  </div>
                  <div
                    className="border-t my-2"
                    style={{ borderColor: LINE }}
                  ></div>
                  <div className="flex justify-between items-baseline text-base font-semibold text-[#171512]">
                    <span>Total</span>
                    <span className="text-lg italic" style={SERIF}>
                      Rs {total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  className="w-full bg-[#171512] hover:bg-black text-white font-semibold py-4 rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-[0.15em]"
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-5" style={SANS}>
          <div
            className="bg-white text-[#171512] w-full max-w-[480px] border p-6 rounded-2xl max-h-[90vh] overflow-y-auto"
            style={{ borderColor: LINE }}
          >
            <div
              className="flex items-center gap-3 border-b pb-4 mb-6"
              style={{ borderColor: LINE }}
            >
              <h2 className="text-base flex-grow text-[#171512]" style={SERIF}>
                Track Your Order
              </h2>
              <span
                className="border font-mono text-[10px] font-semibold px-3 py-1 rounded-lg"
                style={{ borderColor: LINE, color: MUTED }}
              >
                Table {currentTable}
              </span>
            </div>

            {/* Stepper Graphics Timeline */}
            <div className="flex flex-col gap-5 mb-8 relative pl-6">
              <div
                className="absolute left-[11px] top-2 bottom-2 w-[2px]"
                style={{ backgroundColor: LINE }}
              />
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
                    className="relative flex gap-4 items-start transition-all duration-300"
                    style={{
                      opacity: isActive ? 1 : isCompleted ? 0.85 : 0.35,
                    }}
                  >
                    {/* Circle timeline Indicator */}
                    <div
                      className="absolute -left-[21px] w-6 h-6 rounded-full font-semibold text-xs flex items-center justify-center shrink-0 border-2 z-10 bg-white transition-colors"
                      style={{
                        borderColor: isCompleted || isActive ? WINE : "#DDDDDD",
                        backgroundColor: isActive ? WINE : "#FFFFFF",
                        color: isActive
                          ? "#FFFFFF"
                          : isCompleted
                            ? WINE
                            : "#AAAAAA",
                      }}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <div className="pl-2">
                      <div
                        className="font-semibold text-sm"
                        style={{ color: isActive ? INK : "#555555" }}
                      >
                        {step.title}
                      </div>
                      <div
                        className="text-[11px] mt-0.5"
                        style={{ color: MUTED }}
                      >
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mini invoice summary */}
            <div
              className="border p-5 rounded-xl mb-6"
              style={{ borderColor: LINE }}
            >
              <h3 className="font-semibold text-xs uppercase tracking-wider mb-3 text-[#171512]">
                Order Details
              </h3>
              <ul className="flex flex-col gap-2.5">
                {activeOrder.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex justify-between text-xs"
                    style={{ color: MUTED }}
                  >
                    <span>
                      {item.name}{" "}
                      <span className="font-semibold text-[#171512]">
                        x{item.quantity}
                      </span>
                    </span>
                    <span>Rs {(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div
                className="border-t my-4"
                style={{ borderColor: LINE }}
              ></div>
              <div className="flex justify-between items-baseline font-semibold text-sm text-[#171512]">
                <span>Total</span>
                <span className="text-base italic" style={SERIF}>
                  Rs {activeOrder.billing.total.toFixed(2)}
                </span>
              </div>
            </div>


          </div>
        </div>
      )}

      {/* ── PAYMENT COMPLETE OVERLAY ──────────────────────────────────────── */}
      {showPaidScreen && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-8"
          style={{
            ...SANS,
            background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #0d0d0d 100%)",
          }}
        >
          <FontImport />
          {/* Animated ring */}
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center mb-8"
            style={{
              background: "linear-gradient(135deg, #7A2331, #c43f55)",
              boxShadow: "0 0 60px rgba(122,35,49,0.6), 0 0 120px rgba(122,35,49,0.3)",
              animation: "paidPulse 2s ease-in-out infinite",
            }}
          >
            <Check className="w-14 h-14 text-white stroke-[2.5px]" />
          </div>

          <h1
            className="text-4xl text-white text-center mb-3 leading-tight"
            style={SERIF}
          >
            Payment Complete!
          </h1>
          <p className="text-lg text-white/60 text-center mb-2" style={SERIF}>
            Thank you for dining with us
          </p>
          <p className="text-sm text-white/40 text-center mb-10">
            {restaurantInfo?.name || "Gourmet Bistro"} • Table {currentTable}
          </p>

          {/* Receipt summary */}
          <div
            className="w-full max-w-xs rounded-2xl p-5 mb-8"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {activeOrder?.items?.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between text-xs text-white/60 mb-2"
              >
                <span>{item.name} <span className="text-white/40">×{item.quantity}</span></span>
                <span>Rs {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div
              className="border-t mt-3 pt-3"
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
            />
            <div className="flex justify-between text-white font-semibold text-sm mt-1">
              <span>Total Paid</span>
              <span className="text-lg italic" style={SERIF}>
                Rs {activeOrder?.billing?.total?.toFixed(2)}
              </span>
            </div>
          </div>

          <p className="text-white/30 text-xs tracking-widest uppercase">
            Resetting in 5 seconds…
          </p>

          {/* Pulse keyframe injected inline */}
          <style>{`
            @keyframes paidPulse {
              0%, 100% { box-shadow: 0 0 60px rgba(122,35,49,0.6), 0 0 120px rgba(122,35,49,0.3); transform: scale(1); }
              50% { box-shadow: 0 0 80px rgba(122,35,49,0.9), 0 0 160px rgba(122,35,49,0.5); transform: scale(1.04); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
