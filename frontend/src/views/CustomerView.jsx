import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { realTimeSync } from "../utils/socket";
import { API_URL } from "../utils/config";
import { ShoppingBag, ArrowRight } from "lucide-react";

import FoodCategoryCard from "../components/customer/FoodCategoryCard";
import CustomerHeader from "../components/customer/CustomerHeader";
import SizeSelectionModal from "../components/customer/SizeSelectionModal";
import CartDrawer from "../components/customer/CartDrawer";
import ActiveOrderTracker from "../components/customer/ActiveOrderTracker";
import InvalidQrOverlay from "../components/customer/InvalidQrOverlay";
import TableOccupiedOverlay from "../components/customer/TableOccupiedOverlay";
import DemoTableModal from "../components/customer/DemoTableModal";
import PaidThankYouOverlay from "../components/customer/PaidThankYouOverlay";

import {
  TAX_RATE,
  SERVICE_CHARGE_RATE,
  DEFAULT_RESTAURANT_SLUG,
  SERIF,
  SANS,
  INK,
  MUTED,
  LINE,
  calculateCartTotals,
  playBellNotification,
  generateTableCodeFallback
} from "../utils/customerConstants";

const BACKEND_URL = API_URL;

function FontImport() {
  return (
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');`}</style>
  );
}

export default function CustomerView() {
  const [currentTable, setCurrentTable] = useState(null);
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [resolvedUuid, setResolvedUuid] = useState(null);
  const [menuData, setMenuData] = useState([]);
  const [category, setCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState({}); // { itemId or cartKey: quantity }
  const [sizeModalItem, setSizeModalItem] = useState(null);
  const [selectedSizeObj, setSelectedSizeObj] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showDemoTableOverlay, setShowDemoTableOverlay] = useState(false);
  const [selectedDemoTable, setSelectedDemoTable] = useState("1");
  const [showPaidScreen, setShowPaidScreen] = useState(false);
  const [isTableOccupiedByOthers, setIsTableOccupiedByOthers] = useState(false);
  const [occupiedOrderDetails, setOccupiedOrderDetails] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [qrToken, setQrToken] = useState(null);
  const [isQrValid, setIsQrValid] = useState(true);

  // Helper for stored restaurant slug
  const getStoredRestaurantSlug = () => restaurantId || localStorage.getItem("ordering_restaurant") || DEFAULT_RESTAURANT_SLUG;

  // Check table occupied status
  const checkTableOccupiedStatus = async (tbl, slug) => {
    if (!tbl) return;
    try {
      const targetSlug = slug || getStoredRestaurantSlug();
      if (!targetSlug) return;
      const res = await fetch(`${BACKEND_URL}/api/v1/orders/table-status/${tbl}?restaurant=${targetSlug}`);
      const result = await res.json();
      if (result.success && result.occupied) {
        const savedOrderId = localStorage.getItem(`active_order_table_${tbl}`);
        if (savedOrderId && savedOrderId === result.activeOrderId) {
          setIsTableOccupiedByOthers(false);
          setOccupiedOrderDetails(null);
        } else {
          setIsTableOccupiedByOthers(true);
          setOccupiedOrderDetails(result);
        }
      } else {
        setIsTableOccupiedByOthers(false);
        setOccupiedOrderDetails(null);
        // Table is free in database! Clear any stale local storage tracking
        const targetTbl = tbl || currentTable || localStorage.getItem("ordering_table");
        if (targetTbl) {
          localStorage.removeItem(`active_order_table_${targetTbl}`);
        }
        setActiveOrderId(null);
        setActiveOrder(null);
      }
    } catch (err) {
      console.error("Table status check error:", err);
    }
  };

  // Verify QR Token or Code on backend
  const verifyQrTokenOnServer = async (tokenOrCode, slug) => {
    const targetSlug = slug || getStoredRestaurantSlug();
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/qr/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: tokenOrCode, token: tokenOrCode, restaurant: targetSlug }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setSessionId(result.data.sessionId);
          sessionStorage.setItem("verified_qr_session", result.data.sessionId);
          if (result.data.tableNumber) {
            setCurrentTable(result.data.tableNumber);
            localStorage.setItem("ordering_table", result.data.tableNumber);
          }
          if (result.data.tableCode) {
            setQrToken(result.data.tableCode);
            try {
              const u = new URL(window.location.href);
              if (u.searchParams.get("table") !== result.data.tableCode) {
                u.searchParams.set("table", result.data.tableCode);
                window.history.replaceState({}, "", u.pathname + u.search);
              }
            } catch (err) {}
          }
          setIsQrValid(true);
          return result.data;
        }
      }
    } catch (e) {
      console.error("QR resolution fetch error:", e);
    }

    // Fallback 1: Match 6-character random table code against generated codes for Table 1..50
    if (tokenOrCode && String(tokenOrCode).trim().length === 6) {
      const cleanCode = String(tokenOrCode).trim().toUpperCase();
      for (let i = 1; i <= 50; i++) {
        const expectedCode = generateTableCodeFallback(i, targetSlug);
        if (expectedCode === cleanCode) {
          const tableNumber = String(i);
          setSessionId(cleanCode);
          sessionStorage.setItem("verified_qr_session", cleanCode);
          setCurrentTable(tableNumber);
          localStorage.setItem("ordering_table", tableNumber);
          setIsQrValid(true);
          return { sessionId: cleanCode, tableNumber };
        }
      }
    }

    // Fallback 2: decode JWT payload if a signed token string was passed
    try {
      const parts = tokenOrCode.split('.');
      if (parts.length >= 2) {
        const base64Str = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(decodeURIComponent(escape(atob(base64Str))));
        const tableNumber = String(payload.tableNumber || payload.table);
        if (tableNumber) {
          setSessionId(tokenOrCode);
          sessionStorage.setItem("verified_qr_session", tokenOrCode);
          setCurrentTable(tableNumber);
          localStorage.setItem("ordering_table", tableNumber);
          setIsQrValid(true);
          return { sessionId: tokenOrCode, tableNumber };
        }
      }
    } catch (err) {}

    setIsQrValid(false);
    toast.error("Invalid or unassigned table code. Access denied.");
    return null;
  };

  const handleDemoTableSubmit = async () => {
    try {
      const restSlug = getStoredRestaurantSlug();
      const res = await fetch(`${BACKEND_URL}/api/v1/qr/generate?table=${selectedDemoTable}&restaurant=${restSlug}`);
      const result = await res.json();
      if (result.success && result.data?.tableCode) {
        setShowDemoTableOverlay(false);
        const code = result.data.tableCode;
        setQrToken(code);
        await verifyQrTokenOnServer(code, restSlug);
        checkTableOccupiedStatus(selectedDemoTable, restSlug);
      }
    } catch (e) {
      console.error("Demo table code fetch error:", e);
    }
  };

  // Detect table and initialize session
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlQrToken = urlParams.get("t");
    const urlTable = urlParams.get("table");

    const pathMatch = window.location.pathname.match(/^\/r\/([^/]+)/);
    const pathSlug = pathMatch ? pathMatch[1] : null;

    let restId = pathSlug || urlParams.get("restaurant");
    if (!restId) {
      restId = localStorage.getItem("ordering_restaurant");
    }

    if (restId) {
      setRestaurantId(restId);
      localStorage.setItem("ordering_restaurant", restId);
    }

    const codeOrToken = urlQrToken || urlTable;

    if (codeOrToken) {
      setQrToken(codeOrToken);
      verifyQrTokenOnServer(codeOrToken, restId).then((data) => {
        if (data && data.tableNumber) {
          checkTableOccupiedStatus(data.tableNumber, restId);
          const savedOrderId = localStorage.getItem(`active_order_table_${data.tableNumber}`);
          if (savedOrderId) {
            setActiveOrderId(savedOrderId);
            fetchOrderDetails(savedOrderId, restId);
          }
        }
      });
    } else {
      const savedSession = sessionStorage.getItem("verified_qr_session");
      const savedTable = localStorage.getItem("ordering_table");

      if (savedSession && savedTable) {
        setSessionId(savedSession);
        setCurrentTable(savedTable);
        checkTableOccupiedStatus(savedTable, restId);
        const savedOrderId = localStorage.getItem(`active_order_table_${savedTable}`);
        if (savedOrderId) {
          setActiveOrderId(savedOrderId);
          fetchOrderDetails(savedOrderId, restId);
        }
      } else {
        setShowDemoTableOverlay(true);
      }
    }
  }, []);

  // Fetch restaurant details & menu & register socket
  useEffect(() => {
    const targetSlug = getStoredRestaurantSlug();
    if (!targetSlug) return;

    realTimeSync.registerRestaurant(targetSlug, "customer");

    fetch(`${BACKEND_URL}/api/v1/restaurants/public/${targetSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setRestaurantInfo(data.data);
          if (data.data.id) setResolvedUuid(data.data.id);
        }
      })
      .catch((err) => console.error("Error fetching restaurant info:", err));

    fetch(`${BACKEND_URL}/api/v1/menu/public/${targetSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setMenuData(data.data);
        }
      })
      .catch((err) => console.error("Error fetching menu:", err));
  }, [restaurantId]);

  // Realtime order update listener
  useEffect(() => {
    const cleanup = realTimeSync.onOrderUpdate((updatedOrder) => {
      const targetTbl = currentTable || localStorage.getItem("ordering_table");
      const orderTable = (updatedOrder.table_name || updatedOrder.table || '').toString().replace(/[^0-9]/g, '');

      if (activeOrderId && (updatedOrder.id === activeOrderId || updatedOrder.order_number === activeOrderId)) {
        setActiveOrder((prev) => ({ ...prev, ...updatedOrder }));

        if (updatedOrder.status === "completed" || updatedOrder.status === "cancelled") {
          if (targetTbl) {
            localStorage.removeItem(`active_order_table_${targetTbl}`);
          }

          if (updatedOrder.status === "completed") {
            setShowPaidScreen(true);
            playBellNotification();
          }

          // Clear active order after showing paid screen
          setActiveOrderId(null);
          setActiveOrder(null);
        }
      }

      // Automatically unlock table overlay when order is completed or paid
      if (targetTbl && orderTable === targetTbl) {
        if (updatedOrder.status === "completed" || updatedOrder.status === "cancelled") {
          setIsTableOccupiedByOthers(false);
          setOccupiedOrderDetails(null);
          checkTableOccupiedStatus(targetTbl, getStoredRestaurantSlug());
        }
      }
    });

    return () => cleanup();
  }, [activeOrderId, currentTable, restaurantId]);

  // Prevent page refresh / back navigation while order is active
  useEffect(() => {
    if (!activeOrder) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Your order is being prepared. Leaving this page may cause you to lose your order tracking.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    // Also block back button
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [activeOrder]);

  const fetchOrderDetails = (orderId, slug) => {
    const targetSlug = slug || getStoredRestaurantSlug();
    fetch(`${BACKEND_URL}/api/v1/orders/track/${orderId}?restaurant=${targetSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          if (data.data.status === "completed" || data.data.status === "cancelled") {
            const tbl = currentTable || localStorage.getItem("ordering_table");
            if (tbl) {
              localStorage.removeItem(`active_order_table_${tbl}`);
            }
            setActiveOrderId(null);
            setActiveOrder(null);
          } else {
            setActiveOrder(data.data);
          }
        }
      })
      .catch((err) => console.error("Error fetching order details:", err));
  };

  // Cart Qty Modifiers
  const handleQtyChange = (cartKey, delta) => {
    setCart((prev) => {
      const currentQty = prev[cartKey] || 0;
      const newQty = currentQty + delta;
      if (newQty <= 0) {
        const nextCart = { ...prev };
        delete nextCart[cartKey];
        return nextCart;
      }
      return { ...prev, [cartKey]: newQty };
    });
  };

  const handleOpenSizeModal = (item) => {
    setSizeModalItem(item);
    if (Array.isArray(item.sizes) && item.sizes.length > 0) {
      setSelectedSizeObj(item.sizes[0]);
    }
  };

  const handleAddSelectedSizeToCart = () => {
    if (!sizeModalItem || !selectedSizeObj) return;
    const cartKey = `${sizeModalItem.id}_size_${selectedSizeObj.name}`;
    handleQtyChange(cartKey, 1);
    setSizeModalItem(null);
    setSelectedSizeObj(null);
    toast.success(`Added ${sizeModalItem.name} (${selectedSizeObj.name})`);
  };

  // Helper to map cartKey -> Item info
  const getItemInfoFromCartKey = (cartKey) => {
    if (!cartKey) return null;
    const sizeIndex = cartKey.indexOf("_size_");
    if (sizeIndex !== -1) {
      const itemId = cartKey.substring(0, sizeIndex);
      const sizeName = cartKey.substring(sizeIndex + 6);
      const menuItem = menuData.find((m) => String(m.id) === String(itemId));
      if (!menuItem) return null;
      const sizeObj = menuItem.sizes?.find((s) => s.name === sizeName);
      return {
        id: menuItem.id,
        baseName: menuItem.name,
        name: `${menuItem.name} (${sizeName})`,
        size: sizeName,
        price: sizeObj ? parseFloat(sizeObj.price) : menuItem.price,
        image: menuItem.image,
      };
    } else {
      const menuItem = menuData.find((m) => String(m.id) === String(cartKey));
      if (!menuItem) return null;
      return {
        id: menuItem.id,
        baseName: menuItem.name,
        name: menuItem.name,
        size: null,
        price: menuItem.price,
        image: menuItem.image,
      };
    }
  };

  const { subtotal, count, tax, service, total } = calculateCartTotals(cart, getItemInfoFromCartKey);

  // Submit Order
  const handlePlaceOrder = async () => {
    if (count === 0) return;

    const orderItems = [];
    Object.keys(cart).forEach((cartKey) => {
      const info = getItemInfoFromCartKey(cartKey);
      if (info) {
        orderItems.push({
          id: String(info.id),
          menu_item_id: String(info.id),
          name: info.name,
          price: info.price,
          quantity: cart[cartKey],
        });
      }
    });

    const targetSlug = getStoredRestaurantSlug();

    const orderPayload = {
      restaurantSlug: targetSlug,
      tableNumber: currentTable || "1",
      table: currentTable || "1",
      sessionId: sessionId || qrToken,
      t: qrToken,
      items: orderItems,
      total_amount: total,
    };

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const result = await response.json();

      if (result.success) {
        const createdOrder = result.data;
        setActiveOrderId(createdOrder.id || createdOrder.order_number);
        setActiveOrder(createdOrder);
        setCart({});
        setIsCartOpen(false);

        const tbl = currentTable || "1";
        localStorage.setItem(`active_order_table_${tbl}`, createdOrder.id || createdOrder.order_number);

        toast.success("Order placed successfully!");
        playBellNotification();
      } else {
        toast.error(result.message || "Failed to place order.");
      }
    } catch (error) {
      console.error("Order submit error:", error);
      toast.error("Network error. Please try again.");
    }
  };

  // Categorized & Filtered Menu Items
  const categories = ["all", ...new Set(menuData.map((item) => (item.category || "mains").toLowerCase()))];

  const filteredItems = menuData.filter((item) => {
    const matchesCat = category === "all" || (item.category || "mains").toLowerCase() === category;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const restaurantName = restaurantInfo?.name || "Smart QR Restaurant";

  // Screen Condition Early Returns
  if (!isQrValid) {
    return <InvalidQrOverlay SANS={SANS} FontImport={FontImport} />;
  }

  if (isTableOccupiedByOthers) {
    return (
      <TableOccupiedOverlay
        currentTable={currentTable}
        occupiedOrderDetails={occupiedOrderDetails}
        SANS={SANS}
        SERIF={SERIF}
        FontImport={FontImport}
      />
    );
  }

  if (showPaidScreen) {
    return (
      <PaidThankYouOverlay
        activeOrder={activeOrder}
        onNewOrder={() => {
          setShowPaidScreen(false);
          setActiveOrder(null);
          setActiveOrderId(null);
          setCart({});
        }}
        SANS={SANS}
        SERIF={SERIF}
        FontImport={FontImport}
      />
    );
  }

  // LOCK SCREEN: If an active order exists, show only the stepper tracker (no menu editing)
  if (activeOrder) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900" style={SANS}>
        <FontImport />
        <ActiveOrderTracker
          activeOrder={activeOrder}
          currentTable={currentTable}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-24" style={SANS}>
      <FontImport />

      {/* Sticky Top Bar Header */}
      <CustomerHeader
        restaurantInfo={restaurantInfo}
        restaurantName={restaurantName}
        currentTable={currentTable || "1"}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        category={category}
        setCategory={setCategory}
        categories={categories}
        SERIF={SERIF}
      />

      {/* Main Content Area */}
      <main className="max-w-[880px] mx-auto px-4 sm:px-6 pt-6">
        {/* Active Order Live Tracker */}
        <ActiveOrderTracker
          activeOrder={activeOrder}
          currentTable={currentTable}
          SERIF={SERIF}
          MUTED={MUTED}
          LINE={LINE}
        />

        {/* Menu Items Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-zinc-900" style={SERIF}>
              {category === "all" ? "Full Menu" : category.charAt(0).toUpperCase() + category.slice(1)}
            </h2>
            <span className="text-xs font-semibold text-zinc-400">
              {filteredItems.length} items
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 bg-white border border-zinc-200/80 rounded-3xl p-8">
              <p className="text-sm font-medium">No menu items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {filteredItems.map((item) => {
                const hasSizes = Array.isArray(item.sizes) && item.sizes.length > 0;
                let cartQty = 0;

                if (hasSizes) {
                  Object.keys(cart).forEach((k) => {
                    if (k.startsWith(`${item.id}_size_`)) cartQty += cart[k];
                  });
                } else {
                  cartQty = cart[item.id] || 0;
                }

                return (
                  <FoodCategoryCard
                    key={item.id}
                    item={item}
                    cartQty={cartQty}
                    onQtyChange={(id, delta) => handleQtyChange(id, delta)}
                    onOpenSizeModal={handleOpenSizeModal}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Floating Basket Button */}
      {count > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 px-4 sm:px-6 max-w-[880px] mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full py-4 px-6 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-full shadow-2xl flex justify-between items-center transition-all cursor-pointer border border-rose-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">
                {count}
              </div>
              <span className="text-sm font-bold tracking-wide">View Basket</span>
            </div>
            <div className="flex items-center gap-2 font-mono font-black text-base">
              <span>Rs {total.toFixed(2)}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        getItemInfoFromCartKey={getItemInfoFromCartKey}
        onQtyChange={handleQtyChange}
        subtotal={subtotal}
        tax={tax}
        service={service}
        total={total}
        count={count}
        onPlaceOrder={handlePlaceOrder}
        SERIF={SERIF}
      />

      {/* Size Selection Modal */}
      {sizeModalItem && selectedSizeObj && (
        <SizeSelectionModal
          sizeModalItem={sizeModalItem}
          selectedSizeObj={selectedSizeObj}
          setSelectedSizeObj={setSelectedSizeObj}
          onClose={() => setSizeModalItem(null)}
          onAdd={handleAddSelectedSizeToCart}
        />
      )}

      {/* Demo Table Selection Modal Overlay */}
      {showDemoTableOverlay && (
        <DemoTableModal
          selectedDemoTable={selectedDemoTable}
          setSelectedDemoTable={setSelectedDemoTable}
          onSubmit={handleDemoTableSubmit}
          SANS={SANS}
          SERIF={SERIF}
          LINE={LINE}
          MUTED={MUTED}
          FontImport={FontImport}
        />
      )}
    </div>
  );
}
