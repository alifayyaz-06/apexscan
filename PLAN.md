# Smart QR Ordering System — Complete System Specification & Version Changelog

This document provides a comprehensive overview of the architecture, database schema, security model, and complete version history for the **Smart QR Ordering System**, including the **Waiter Module Integration (v1.5.0)**.

---

## 🏗️ System Architecture & Stack Overview

- **Frontend**: React (Vite, TailwindCSS, Lucide Icons, Sonner notifications) running on port `3006`.
- **Backend**: Node.js, Express, WebSockets (`ws`), Zod Validators, Brevo Email API running on port `3005`.
- **Database**: Supabase PostgreSQL with Schema-Based Multi-Tenancy (`tenant_<slug>`).
- **Authentication**: Centralized Staff Login Portal for all staff roles (Waiters, Kitchen Staff, Sales POS Staff) & Supabase Auth for Restaurant Admins.

---

## 📜 Version History & Feature Matrix

```mermaid
timeline
    title System Version Evolution Roadmap
    v1.0.0 : Multi-Tenant Infrastructure : Staff Roles & Authentication : Supabase Schema Isolation : Base Menu & Order Processing
    v1.1.0 : Secure Random Table Codes : 404 Tampering Protection : JWT Table Sessions : Batch Table Code API
    v1.2.0 : Real-Time WebSocket Sync : Table Session Locking : Auto-Unlock on Settlement : Public Tracking Endpoint
    v1.3.0 : 5-Step Order Stepper Tracker : Strict Post-Order Lock Screen : Navigation & Refresh Guard : Paid Thank-You Overlay
    v1.4.0 : Uniform Order ID Standard : Order Type Badges : Admin Order History Refinements : Vite Proxy & Schema Enhancements
    v1.5.0 (Completed) : Waiter Module Integration : Mobile/Tablet Touch Responsive : Real-time Seller POS Order Queue : Robust Multi-Layer Auth : Auto-Release on Payment
```

---

## 📋 Implementation Summary — Integrated Waiter Module (v1.5.0)

### Order Flow Pipeline

```mermaid
flowchart LR
    Waiter["🧑‍🍳 Waiter POS<br/>(Select Table → Menu → Cart → Submit)"]
    SellerPOS["💰 Seller POS Screen<br/>(Real-time order appears as 'pending')"]
    Kitchen["👨‍🍳 Kitchen KDS<br/>(Order appears after seller confirms)"]
    Customer["📱 Customer Tracker<br/>(Live 5-step progress)"]

    Waiter -->|"POST /orders<br/>order_source: waiter<br/>status: pending"| SellerPOS
    SellerPOS -->|"PATCH status → cooking"| Kitchen
    Kitchen -->|"PATCH status → ready/served"| Customer
    SellerPOS -->|"POST /pay → completed"| Customer
```

### Key Bug Fixes in v1.5.0

| Issue | Root Cause | Fix | Commit |
|-------|-----------|-----|--------|
| `Role must be kitchen_staff, sales_staff or rider` | staffController.js hardcoded role array missing `waiter` | Added `waiter` to validation array | `026a310` |
| `403 Forbidden` on `/orders/active` | api.js `authorize()` missing `waiter` role | Added `waiter` to all order route authorizations | `f93d122` |
| Waiter login → wrong screen | LoginView.jsx redirected all non-kitchen staff to `/waiter` (seller route) | Added explicit `waiter` role → `/waiter-pos` redirect | `80b5088` |
| `403 Forbidden` on `/restaurants/settings` | Route only allowed `admin` role | Added `sales_staff`, `waiter`, `kitchen_staff` | `f44aa94` |
| `tenantGuard` 403 on staff requests | Missing `req.restaurantId`/`req.restaurantSlug` caused hard 403 | Added fallback auto-population from `req.user` | `0311770` |
| **Orders not appearing on Seller screen** | `restaurantParam` in `createOrder` never fell back to `req.body.restaurantSlug`, causing wrong tenant storage AND skipping WebSocket broadcast entirely | Added `|| reqSlug` fallback to `restaurantParam` resolution chain | `955ee36` |

### Architecture Overview

```mermaid
flowchart TD
    subgraph CentralAuth["Centralized Staff Login Portal"]
        CentralLogin["Single Login for ALL Staff Roles"]
    end

    subgraph Clients["Role-Based Operational Interfaces"]
        AdminView["1. Admin Panel (/admin)"]
        WaiterPOS["2. Waiter Table POS (/waiter-pos)"]
        CustomerView["3. Customer QR Menu (/customer)"]
        KitchenView["4. Kitchen Display (/kitchen)"]
        SellerPOS["5. Seller POS Terminal (/waiter)"]
    end

    subgraph Backend["Express & WebSocket Core (Port 3005)"]
        AuthMiddleware["Auth & RBAC Middleware"]
        TenantGuard["Tenant Guard (Auto-Fallback)"]
        OrderPipeline["Unified Order Controller"]
        WSServer["Real-Time WebSocket Broadcast"]
    end

    CentralLogin -->|role: kitchen_staff| KitchenView
    CentralLogin -->|role: sales_staff| SellerPOS
    CentralLogin -->|role: waiter| WaiterPOS
    CentralLogin -->|role: admin| AdminView

    WaiterPOS -->|"Submit Order (restaurantSlug in body)"| OrderPipeline
    OrderPipeline -->|"Resolve tenant via reqSlug fallback"| WSServer
    WSServer -->|"ORDER_CREATED broadcast"| SellerPOS
    WSServer -->|"ORDER_CREATED broadcast"| KitchenView
    SellerPOS -->|"8s polling safety net"| OrderPipeline
```

---

## 📁 Key File Locations

### Backend
- [orderController.js](file:///c:/Users/ALI/OneDrive/Desktop/smart%20ordering%20system/backend/src/controllers/orderController.js): Order creation with `reqSlug` fallback & WebSocket broadcast.
- [api.js](file:///c:/Users/ALI/OneDrive/Desktop/smart%20ordering%20system/backend/src/routes/api.js): Route authorization for all staff roles.
- [auth.js](file:///c:/Users/ALI/OneDrive/Desktop/smart%20ordering%20system/backend/src/middleware/auth.js): Multi-layer restaurant resolution for staff JWT tokens.
- [tenantGuard.js](file:///c:/Users/ALI/OneDrive/Desktop/smart%20ordering%20system/backend/src/middleware/tenantGuard.js): Auto-fallback tenant context for authenticated staff.
- [staffController.js](file:///c:/Users/ALI/OneDrive/Desktop/smart%20ordering%20system/backend/src/controllers/staffController.js): Staff creation with `waiter` role validation.
- [authController.js](file:///c:/Users/ALI/OneDrive/Desktop/smart%20ordering%20system/backend/src/controllers/authController.js): Staff JWT with `restaurantSlug` in token payload.

### Frontend
- [WaiterPosView.jsx](file:///c:/Users/ALI/OneDrive/Desktop/smart%20ordering%20system/frontend/src/views/WaiterPosView.jsx): Mobile/tablet touch-responsive Waiter POS with table dropdown, floating basket, cart modal.
- [WaiterView.jsx](file:///c:/Users/ALI/OneDrive/Desktop/smart%20ordering%20system/frontend/src/views/WaiterView.jsx): Seller POS with 8s polling + WebSocket real-time sync.
- [LoginView.jsx](file:///c:/Users/ALI/OneDrive/Desktop/smart%20ordering%20system/frontend/src/views/LoginView.jsx): Centralized staff login with role-based redirection.
- [App.jsx](file:///c:/Users/ALI/OneDrive/Desktop/smart%20ordering%20system/frontend/src/App.jsx): Route guards and authenticated role redirection.
