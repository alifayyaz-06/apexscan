import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { realTimeSync } from "../utils/socket";
import { API_URL } from "../utils/config";
import { UtensilsCrossed } from "lucide-react";

import KitchenHeader from "../components/kitchen/KitchenHeader";
import KitchenOrderCard from "../components/kitchen/KitchenOrderCard";
import {
  DEFAULT_KITCHEN_SLUG,
  AUTO_REFRESH_INTERVAL_MS,
  ELAPSED_TIMER_INTERVAL_MS,
  playKitchenChime
} from "../utils/kitchenConstants";

const BACKEND_URL = API_URL;

export default function KitchenView() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [completedItemsMap, setCompletedItemsMap] = useState({});
  const [, setTimerTick] = useState(0);

  const getKitchenRestaurantSlug = () => {
    return user?.restaurantSlug || user?.slug || user?.restaurant_slug || localStorage.getItem("ordering_restaurant") || DEFAULT_KITCHEN_SLUG;
  };

  const fetchKitchenOrders = async () => {
    const slug = getKitchenRestaurantSlug();
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/orders?restaurant=${slug}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error("Error fetching kitchen orders:", err);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();

    // Auto refresh fallback interval
    const refreshInterval = setInterval(() => {
      fetchKitchenOrders();
    }, AUTO_REFRESH_INTERVAL_MS);

    // Timer tick to re-render elapsed minutes counters every second
    const timerInterval = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, ELAPSED_TIMER_INTERVAL_MS);

    // Realtime order update listener
    const cleanup = realTimeSync.onOrderUpdate((newOrUpdatedOrder) => {
      setOrders((prevOrders) => {
        const index = prevOrders.findIndex((o) => o.id === newOrUpdatedOrder.id);

        if (index !== -1) {
          const updated = [...prevOrders];
          updated[index] = { ...updated[index], ...newOrUpdatedOrder };
          return updated;
        } else {
          // New incoming order! Play chime sound
          if (soundEnabled) {
            playKitchenChime();
          }
          toast.success(`New order received for Table ${newOrUpdatedOrder.tableNumber || newOrUpdatedOrder.table || '1'}!`);
          return [newOrUpdatedOrder, ...prevOrders];
        }
      });
    });

    return () => {
      clearInterval(refreshInterval);
      clearInterval(timerInterval);
      cleanup();
    };
  }, [user, soundEnabled]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("ordering_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${BACKEND_URL}/api/v1/orders/${orderId}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Order status updated to ${newStatus}`);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      } else {
        toast.error(data.message || "Failed to update status");
      }
    } catch (err) {
      toast.error("Network error updating order status");
    }
  };

  const handleToggleItemCheck = (itemKey) => {
    setCompletedItemsMap((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  // Calculate badge counts
  const counts = {
    all: orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length,
    pending: orders.filter((o) => o.status === "pending").length,
    cooking: orders.filter((o) => o.status === "cooking").length,
    ready: orders.filter((o) => o.status === "ready").length,
  };

  const filteredOrders = orders.filter((o) => {
    if (o.status === "completed" || o.status === "cancelled") return false;
    if (filter === "all") return true;
    return (o.status || "pending").toLowerCase() === filter;
  });

  const restaurantName = user?.restaurantName || "Smart Kitchen";

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 pb-16 font-sans">
      {/* KDS Header */}
      <KitchenHeader
        restaurantName={restaurantName}
        filter={filter}
        setFilter={setFilter}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        onLogout={logout}
        counts={counts}
      />

      {/* Main KDS Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-3xl p-16 text-center text-zinc-400 max-w-md mx-auto shadow-sm my-12">
            <UtensilsCrossed size={48} className="mx-auto mb-4 text-zinc-300 stroke-1" />
            <h3 className="text-base font-bold text-zinc-800 mb-1">No Orders in Kitchen</h3>
            <p className="text-xs text-zinc-500">
              There are currently no active orders in "{filter}" status.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((order) => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                completedItemsMap={completedItemsMap}
                onToggleItemCheck={handleToggleItemCheck}
                onUpdateStatus={handleUpdateStatus}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
