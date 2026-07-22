// Billing constants
export const TAX_RATE = 0.08; // 8% Sales Tax
export const SERVICE_CHARGE_RATE = 0.05; // 5% Service Charge
export const DEFAULT_RATING = 4.8;
export const DEFAULT_PREP_TIME = "25–35 min";
export const DEFAULT_RESTAURANT_SLUG = "cheezious";
export const AUDIO_BELL_URL = "https://assets.mixkit.co/active_storage/sfx/911/911-84.wav";

// Design Tokens
export const INK = "#171512";
export const MUTED = "#8A8580";
export const LINE = "#EBE7E0";
export const WINE = "#7A2331";
export const SERIF = { fontFamily: "'Roboto Condensed', sans-serif" };
export const SANS = { fontFamily: "'Roboto Condensed', sans-serif" };

/**
 * Calculates item totals, taxes, and grand totals for cart
 */
export function calculateCartTotals(cart, getItemInfoFn) {
  let subtotal = 0;
  let count = 0;

  Object.keys(cart).forEach((key) => {
    const info = getItemInfoFn(key);
    if (info) {
      subtotal += info.price * cart[key];
      count += cart[key];
    }
  });

  const tax = parseFloat((subtotal * TAX_RATE).toFixed(2));
  const service = parseFloat((subtotal * SERVICE_CHARGE_RATE).toFixed(2));
  const total = parseFloat((subtotal + tax + service).toFixed(2));

  return { subtotal, count, tax, service, total };
}

/**
 * Safely plays audio alert notification
 */
export function playBellNotification() {
  try {
    const audio = new Audio(AUDIO_BELL_URL);
    audio.play().catch(() => {});
  } catch (e) {}
}

/**
 * Deterministic table code generator fallback (matches backend TableCodeManager)
 */
export function generateTableCodeFallback(tableNum, slug) {
  const rSlug = slug || DEFAULT_RESTAURANT_SLUG;
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let seed = 0;
  const str = `${rSlug}_tbl_${tableNum}`;
  for (let i = 0; i < str.length; i++) seed += str.charCodeAt(i);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[(seed * (i + 7) + 13 * (i + 1)) % CHARS.length];
  }
  return code;
}
