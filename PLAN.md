# Manual Order Feature — Frontend-First Chunked Plan

## Current Architecture Summary

- **WaiterView.jsx** (880 lines): 3 tabs (Live, Served/Bills, History), Kanban columns, billing modal, edit modal
- **Order creation**: `POST /api/v1/orders` with `{ table, items, restaurant_id }`
- **No existing order types** (no dine-in/takeaway/delivery distinction)
- **No `order_source` field** (all orders are QR-based currently)
- **WebSocket**: `ORDER_CREATED` and `ORDER_UPDATED` events handled in WaiterView

---

## Chunk 1: WaiterView Enhancements (Badges + Filters + Button)

**Files:** `frontend/src/views/WaiterView.jsx`

**Changes:**
1. Add `+ New Manual Order` button in the header (next to nav tabs)
2. Add order source badge on each order card ("QR" blue / "Manual" green / "Delivery" orange)
3. Add filter row below header: All | QR | Manual | Dine In | Take Away | Delivery
4. Add state: `orderFilter`, `isManualOrderOpen`
5. Filter logic applied to `pendingOrders`, `preparingOrders`, `readyOrders`

**No backend changes needed** — badges will read `order.order_source` field (will default to 'qr' if missing).

---

## Chunk 2: Manual Order Modal — Shell + Menu Grid (Left Side)

**Files:** NEW `frontend/src/components/ManualOrderModal.jsx`

**Changes:**
1. Full-screen modal overlay (z-50) with 2-panel layout (left 60% / right 40%)
2. Left side: Menu browsing panel
   - Fetch menu from existing `GET /api/v1/menu` endpoint
   - Search bar with real-time filtering
   - Category tabs (All, Starters, Mains, Desserts, Drinks)
   - Responsive grid of menu cards (image, name, price, availability badge)
   - Click card → add to cart
3. Import and render from WaiterView when `isManualOrderOpen === true`

---

## Chunk 3: Manual Order Modal — Cart Panel (Right Side)

**Files:** `frontend/src/components/ManualOrderModal.jsx`

**Changes:**
1. Right panel: sticky cart/order summary
2. Cart items: image thumbnail, name, quantity +/- controls, unit price, line total
3. Subtotal, tax (use restaurant's tax rate), service charge, grand total
4. Order notes textarea
5. Clear Cart button
6. Proceed button (disabled until cart has items)

---

## Chunk 4: Order Type Selection + Customer Details Forms

**Files:** `frontend/src/components/ManualOrderModal.jsx`

**Changes:**
1. After clicking "Proceed", show order type step
2. Radio group: Dine In | Take Away | Delivery
3. Conditional forms:
   - **Dine In**: Table dropdown, guest count, notes
   - **Take Away**: Customer name, phone, notes, estimated pickup time
   - **Delivery**: Customer name, phone, address, area, city, delivery instructions
4. For Delivery: rider assignment dropdown (hardcoded placeholder until backend exists)
5. Back button to return to menu/cart

---

## Chunk 5: Payment Selection + Order Submission

**Files:** `frontend/src/components/ManualOrderModal.jsx`

**Changes:**
1. Payment step after order type
2. Payment method: Cash | Card | Online | Pending
3. For Pending: show note that balance will be tracked
4. Confirm Order button → calls `POST /api/v1/orders` with extended payload:
   ```json
   {
     "table": "5",
     "items": [{ "id": "m1", "quantity": 2 }],
     "restaurant_id": "slug",
     "order_source": "manual",
     "order_type": "dine_in",
     "customer_info": { "name": "...", "phone": "..." },
     "delivery_info": { "address": "...", "area": "...", "city": "..." },
     "rider_info": { "id": "...", "name": "..." },
     "payment_method": "cash",
     "payment_status": "paid"
   }
   ```
5. On success: close modal, order arrives via WebSocket as usual
6. On error: show toast

**Note:** Backend won't accept these extra fields yet — the order will still be created with just `table` + `items`. Extra fields will be wired in the backend chunk later.

---

## Chunk 6: Real-Time QR Notification During Manual Order

**Files:** `frontend/src/views/WaiterView.jsx`

**Changes:**
1. When `isManualOrderOpen === true` and `ORDER_CREATED` fires:
   - Show a toast notification (non-intrusive) with order info
   - Play notification sound (existing `playAlertSound`)
   - Toast is clickable → closes modal, highlights the new order
2. The existing order insertion into `liveOrders` state continues working (already handled)
3. Do NOT interrupt the manual order form

---

## Execution Order

```
Chunk 1 → Chunk 2 → Chunk 3 → Chunk 4 → Chunk 5 → Chunk 6
```

Each chunk is independently testable. After Chunk 5, the full manual order flow works end-to-end (backend will ignore unknown fields but still create the order with table + items). The backend chunks come after to properly persist the extra fields.

---

## Notes

- All styling follows existing pattern: white bg, zinc borders, rounded-2xl, font-bold text-xs buttons
- No new dependencies needed (Lucide icons already available, Sonner toast already in use)
- The modal will be a single component with internal step navigation (menu → cart → type → payment → confirm)
