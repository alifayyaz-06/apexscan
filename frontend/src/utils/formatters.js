/**
 * Formats an order object into a daily resetting Invoice / Order ID
 * Example: INV-20260721-001
 */
export function formatOrderId(order) {
  if (!order) return '';

  if (typeof order !== 'object') {
    const str = String(order);
    if (str.startsWith('INV-') || str.startsWith('ORD-')) return str;
    return `INV-${str}`;
  }

  // 1. If stored explicitly in invoice_no or billing.invoice_no
  if (order.invoice_no) return order.invoice_no;
  if (order.billing?.invoice_no) return order.billing.invoice_no;

  // 2. Extract date (YYYYMMDD) from timestamp / created_at or fallback to today
  const rawDate = order.timestamp || order.created_at || order.createdAt;
  const d = rawDate ? new Date(rawDate) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // 3. Daily sequence number (order_number)
  let numStr = '001';
  if (order.daily_order_number !== undefined && order.daily_order_number !== null) {
    numStr = String(order.daily_order_number).padStart(3, '0');
  } else if (order.billing?.daily_order_number !== undefined && order.billing?.daily_order_number !== null) {
    numStr = String(order.billing.daily_order_number).padStart(3, '0');
  } else if (order.order_number !== undefined && order.order_number !== null) {
    const numVal = parseInt(order.order_number, 10);
    numStr = isNaN(numVal) ? String(order.order_number) : String(numVal).padStart(3, '0');
  } else if (order.id) {
    const cleaned = String(order.id).replace(/\D/g, '');
    numStr = (cleaned.slice(-3) || '001').padStart(3, '0');
  }

  return `INV-${dateStr}-${numStr}`;
}

/**
 * Formats date for receipt printing: 21-Jul-2026 08:45 PM
 */
export function formatReceiptDate(rawDate) {
  const d = rawDate ? new Date(rawDate) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const hourStr = String(hours).padStart(2, '0');

  return `${day}-${month}-${year} ${hourStr}:${minutes} ${ampm}`;
}

/**
 * Formats currency as Rs.1,700.00
 */
export function formatCurrency(amount) {
  const val = parseFloat(amount) || 0;
  return `Rs. ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
