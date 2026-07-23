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
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:ital,wght@0,100..900;1,100..900&display=swap');`}</style>
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

  // Call Waiter states
  const [showCallWaiterConfirm, setShowCallWaiterConfirm] = useState(false);
  const [waiterCooldown, setWaiterCooldown] = useState(0);
  const [waiterCallLoading, setWaiterCallLoading] = useState(false);

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

  // Cooldown countdown timer
  useEffect(() => {
    if (waiterCooldown > 0) {
      const timer = setTimeout(() => {
        setWaiterCooldown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [waiterCooldown]);

  // Hook up acknowledgement listener
  useEffect(() => {
    const handleAck = (data) => {
      const targetTable = currentTable || localStorage.getItem("ordering_table");
      if (data && String(data.table) === String(targetTable)) {
        toast.success(data.message || "Your waiter is on the way.");
      }
    };
    realTimeSync.on('WAITER_ACKNOWLEDGED', handleAck);
    return () => {
      realTimeSync.off('WAITER_ACKNOWLEDGED', handleAck);
    };
  }, [currentTable]);

  const handleCallWaiter = async () => {
    setShowCallWaiterConfirm(false);
    setWaiterCallLoading(true);
    try {
      const tableNum = currentTable || "1";
      const slug = getStoredRestaurantSlug();
      const res = await fetch(`${BACKEND_URL}/api/v1/orders/call-waiter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: tableNum, restaurantSlug: slug })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(result.message || "Your waiter has been notified and will assist you shortly.");
        setWaiterCooldown(45); // 45s cooldown
      } else {
        toast.error(result.message || "No waiter is currently assigned to your table. Please try again in a moment.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Connection failed. Could not call waiter.");
    } finally {
      setWaiterCallLoading(false);
    }
  };

  const renderCallWaiterButton = () => {
    if (!currentTable) return null;
    return (
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => setShowCallWaiterConfirm(true)}
          disabled={waiterCooldown > 0 || waiterCallLoading}
          className={`flex items-center gap-2 py-3 px-5 rounded-full font-extrabold text-xs shadow-lg transition-all border border-zinc-200/50 cursor-pointer ${
            waiterCooldown > 0
              ? 'bg-zinc-150 text-zinc-400 cursor-not-allowed'
              : 'bg-white hover:bg-zinc-100 text-zinc-950 hover:scale-105'
          }`}
        >
          <span>🔔</span>
          {waiterCooldown > 0 ? `Call Waiter (${waiterCooldown}s)` : 'Call Waiter'}
        </button>
      </div>
    );
  };

  const renderCallWaiterModal = () => {
    if (!showCallWaiterConfirm) return null;
    return (
      <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-[#ECECEC] max-w-sm w-full p-6 shadow-2xl relative text-left">
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-[#111111] tracking-tight">Call Your Waiter</h2>
            <p className="text-[#666666] text-xs mt-1 leading-normal">
              Do you want to call your waiter?
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCallWaiterConfirm(false)}
              className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCallWaiter}
              disabled={waiterCallLoading}
              className="flex-1 py-2.5 bg-[#111111] hover:bg-zinc-900 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
            >
              {waiterCallLoading ? 'Calling...' : 'Call Waiter'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Verify QR Token or Code on backend
  const verifyQrTokenOnServer = async (tokenOrCode, tableNum, slug) => {
    const targetSlug = slug || getStoredRestaurantSlug();
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/qr/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code: tokenOrCode, 
          token: tokenOrCode, 
          table: tableNum || undefined, 
          restaurant: targetSlug 
        }),
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
          if (result.data.isOccupiedMismatch) {
            setIsTableOccupiedByOthers(true);
            setOccupiedOrderDetails({
              activeOrderId: result.data.activeOrderId,
              orderNumber: result.data.orderNumber,
              status: result.data.status
            });
          } else {
            setIsTableOccupiedByOthers(false);
            setOccupiedOrderDetails(null);
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
        await verifyQrTokenOnServer(code, selectedDemoTable, restSlug);
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
      realTimeSync.registerRestaurant(restId, 'customer');
    }

    const codeOrToken = urlQrToken || urlTable;

    if (codeOrToken) {
      setQrToken(codeOrToken);
      const secureToken = urlQrToken || urlTable;
      const tableNumber = urlQrToken ? urlTable : null;

      verifyQrTokenOnServer(secureToken, tableNumber, restId).then((data) => {
        if (data && data.tableNumber) {
          if (!data.isOccupiedMismatch) {
            checkTableOccupiedStatus(data.tableNumber, restId);
            const savedOrderId = localStorage.getItem(`active_order_table_${data.tableNumber}`);
            if (savedOrderId) {
              setActiveOrderId(savedOrderId);
              fetchOrderDetails(savedOrderId, restId);
            }
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

  // Group filtered items by category if category === "all"
  const groupedItems = {};
  if (category === "all") {
    filteredItems.forEach((item) => {
      const cat = (item.category || "Uncategorized").trim();
      if (!groupedItems[cat]) groupedItems[cat] = [];
      groupedItems[cat].push(item);
    });
  }

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
        {renderCallWaiterButton()}
        {renderCallWaiterModal()}
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
          ) : category === "all" ? (
            <div className="space-y-10">
              {Object.entries(groupedItems).map(([catName, items]) => (
                <div key={catName} className="space-y-4">
                  <h3 className="text-base font-bold text-zinc-800 border-b border-zinc-150 pb-2 capitalize tracking-wide" style={SERIF}>
                    {catName}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                    {items.map((item) => {
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
                </div>
              ))}
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

      {renderCallWaiterButton()}
      {renderCallWaiterModal()}
    </div>
  );
}
