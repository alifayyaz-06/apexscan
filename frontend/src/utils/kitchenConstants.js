export const DEFAULT_KITCHEN_SLUG = "cheezious";
export const KITCHEN_CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/911/911-84.wav";
export const AUTO_REFRESH_INTERVAL_MS = 30000;
export const ELAPSED_TIMER_INTERVAL_MS = 1000;

/**
 * Calculates human-readable elapsed minutes string from order timestamp
 */
export function calculateElapsedMinutes(createdAt) {
  if (!createdAt) return "0 min";
  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffMs = Math.max(0, now - createdDate);
  const mins = Math.floor(diffMs / (1000 * 60));
  if (mins === 0) return "Just now";
  return `${mins} min ago`;
}

/**
 * Plays kitchen order bell sound safely
 */
export function playKitchenChime() {
  try {
    const audio = new Audio(KITCHEN_CHIME_URL);
    audio.play().catch(() => {});
  } catch (e) {}
}

/**
 * Returns badge styling for kitchen order status
 */
export function getKitchenStatusBadge(status) {
  switch (status) {
    case "pending":
      return { label: "New Order", bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500 animate-ping" };
    case "cooking":
      return { label: "Cooking", bg: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500 animate-pulse" };
    case "ready":
      return { label: "Ready to Serve", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
    case "served":
      return { label: "Served", bg: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500" };
    default:
      return { label: status, bg: "bg-zinc-100 text-zinc-700 border-zinc-200", dot: "bg-zinc-500" };
  }
}
