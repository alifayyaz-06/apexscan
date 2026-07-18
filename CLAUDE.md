# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart QR Code Ordering System — a multi-tenant restaurant ordering platform. Customers scan a QR code to view menus and place orders. Staff (waiters, kitchen, admin) manage orders in real-time via WebSocket-driven terminals.

## Architecture

**Monorepo with two independent packages:**

- `backend/` — Express.js REST API + WebSocket server (port 3005)
- `frontend/` — Vite + React 19 SPA with Tailwind CSS v4 (port 3006)

**Database:** Supabase (PostgreSQL with RLS). Schema-per-tenant isolation via `create_tenant_schema` RPC. Migrations are sequential SQL files (`supabase_migration_v*.sql`) run manually in the Supabase SQL Editor.

**Multi-tenancy:** Routes are prefixed with `/r/:slug/` (e.g., `/r/kfc/customer`). The backend enforces tenant isolation via `tenantGuard` middleware that scopes queries to the authenticated user's restaurant. The frontend reads the slug from the URL path and stores it in localStorage.

**Real-time:** WebSocket connections register with a `restaurantId`/slug. The server broadcasts order events scoped to the correct tenant. The broadcast function is attached to the Express app via `app.set('wssBroadcast', broadcast)` and accessed in controllers.

**Auth flow:** Admins authenticate via Supabase Auth (email/password). Staff authenticate via a custom JWT system (bcrypt + jsonwebtoken). Tokens are validated in `auth.js` middleware. Roles: `super_admin`, `admin`, `kitchen_staff`, `sales_staff`.

## Commands

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in Supabase credentials, JWT secrets
npm run dev            # starts server on port 3005
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # Vite dev server on port 3006
npm run lint           # oxlint
npm run build          # production build
```

## Key Patterns

- **API base path:** All routes are under `/api/v1/` (defined in `backend/src/routes/api.js`)
- **Validation:** Request validation uses Joi schemas in `backend/src/validators/` applied via `validate` middleware
- **Rate limiting:** Three tiers — `globalLimiter`, `authLimiter`, `orderLimiter` (in `backend/src/middleware/rateLimiter.js`)
- **Frontend routing:** No router library. `App.jsx` parses `window.location.pathname` and renders views directly based on path matching
- **Frontend state:** React Context (`AuthContext.jsx`) manages auth state. No external state library
- **Config:** Backend env vars loaded via `backend/src/config/envs.js` with required-field validation on startup
- **Models:** `backend/src/models/Order.js` and `Menu.js` encapsulate Supabase queries, dynamically reading tax/service charge from restaurant settings

## Frontend Views

| Path | View | Role |
|------|------|------|
| `/r/:slug/customer` | CustomerView | Public (no auth) |
| `/r/:slug/login` | LoginView | Public |
| `/r/:slug/waiter` | WaiterView | sales_staff |
| `/r/:slug/kitchen` | KitchenView | kitchen_staff |
| `/r/:slug/admin` | AdminView | admin |
| `/super` | SuperAdminView | super_admin |

## Environment Variables (Backend)

Required: `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, `SUPER_ADMIN_EMAIL`
Optional: `PORT` (default 3005), `NODE_ENV`, `JWT_REFRESH_SECRET`, `FRONTEND_URL` (default http://localhost:3006)



new reuirement :
You are a Senior Full Stack Developer and UI/UX Designer.

Your task is to enhance the existing Sales Screen of my Smart QR Ordering System without breaking any existing functionality.

The Sales Screen currently displays all live orders placed by customers through QR codes. This functionality is working correctly and must remain unchanged.

Instead of replacing the current workflow, extend it by adding Manual Order Management.

====================================================
CURRENT SYSTEM
====================================================

Currently:

• Customers scan the QR code.
• They place an order.
• The order instantly appears on the Sales Screen.
• Staff process the order.

This real-time order flow must continue to work exactly as it does now.

====================================================
NEW REQUIREMENT
====================================================

The Sales Screen should support TWO independent order sources.

1. QR Orders (Existing)
2. Manual Orders (New)

Both order types should appear together in the same Sales Screen but must be visually distinguishable.

Example badges:

QR Order

Manual Order

====================================================
MANUAL ORDER FEATURE
====================================================

Add a prominent "New Manual Order" button on the Sales Screen.

When clicked, open a full-screen modal or dedicated page.

The interface should look similar to a modern POS system.

====================================================
LEFT SIDE
====================================================

Display the complete restaurant menu.

Each menu item should include:

• Product Image
• Product Name
• Category
• Price
• Availability Status

Provide:

• Search Bar
• Category Filters
• Quick Search
• Grid Layout
• Responsive Cards

Clicking an item adds it to the cart.

====================================================
RIGHT SIDE
====================================================

Display the current order.

Each selected item should show:

• Image
• Name
• Quantity Controls (+ / -)
• Unit Price
• Total Price

Show:

Subtotal

Tax

Discount

Grand Total

Order Notes

Clear Cart

====================================================
ORDER TYPE
====================================================

Before completing the order, the salesperson must choose:

○ Dine In

○ Take Away

○ Delivery

Each option should display different fields.

====================================================
DINE IN
====================================================

Select Table

Number of Guests

Optional Notes

====================================================
TAKE AWAY
====================================================

Customer Name

Phone Number

Optional Notes

Estimated Pickup Time

====================================================
DELIVERY
====================================================

Customer Name

Phone Number

Complete Delivery Address

Area

City

Delivery Instructions

====================================================
DELIVERY RIDER
====================================================

For Delivery Orders:

Assign a Rider.

Select from existing riders.

Display:

• Rider Name
• Rider Phone
• Rider Status

Allow assigning before confirming the order.

====================================================
PAYMENT
====================================================

Support:

Cash

Card

Online

Pending

For delivery orders, allow:

Payment Status:

Paid

Pending

If Pending:

Store the pending amount.

Assign the pending balance to that delivery order.

Display remaining amount until paid.

====================================================
ORDER CONFIRMATION
====================================================

After confirmation:

Create the order using the existing order system.

Do NOT create a separate order table.

Manual orders must behave exactly like QR orders after creation.

Kitchen

Inventory

Reports

Analytics

Invoices

Sales

Everything should continue working.

====================================================
REAL-TIME QR ORDERS
====================================================

The Sales Screen must continue listening for QR orders.

If a customer places an order while the salesperson is creating a manual order:

Immediately show a real-time notification.

Example:

🔔 New QR Order Received

Table 8

Order #1056

2 Items

Play a notification sound.

Allow clicking the notification to open the new order instantly.

Do NOT interrupt the manual order currently being created.

====================================================
ORDER LIST
====================================================

Display both order types together.

Example:

QR Order

Manual Order

Delivery Order

Use different colored badges.

Allow filtering:

All Orders

QR Orders

Manual Orders

Take Away

Delivery

Completed

Pending

Cancelled

====================================================
UI DESIGN
====================================================

The Manual Order screen should look like a professional POS system.

Requirements:

• Large product cards
• Product images
• Modern cart panel
• Sticky order summary
• Rounded cards
• Beautiful typography
• Smooth animations
• Fast search
• Category tabs
• Responsive layout

Design inspiration:

Square POS

Toast POS

Lightspeed POS

Shopify POS

====================================================
IMPORTANT
====================================================

Do NOT break the existing QR ordering flow.

Do NOT modify the current real-time order system.

Reuse the existing APIs, order model, inventory logic, kitchen workflow, reporting, analytics, and billing.

Manual orders should use the same backend order creation process as QR orders.

Only extend the functionality by adding manual order creation, delivery management, rider assignment, and payment tracking.

Before making any code changes, analyze the existing Sales Screen architecture and reuse as much existing code as possible. The final implementation should feel like one unified Sales Screen supporting both QR and Manual orders.