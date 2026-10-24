# ShopEasy Comprehensive Testing Guide

A complete guide to automated testing across the ShopEasy full-stack application.

---

## 1. Test Architecture & Design Principles

ShopEasy employs a layered, automated test strategy using the native **Node.js Test Runner** (`node:test` and `node:assert/strict`) for maximum execution speed, zero third-party testing runner bloat, and modern ECMAScript Module (`import`) compatibility.

### Key Principles
1. **Isolated Non-Destructive Testing**: Tests run against an isolated in-memory MongoDB instance powered by `mongodb-memory-server`. Tests **never** execute destructive mutations against production or live MongoDB Atlas clusters.
2. **Zero Mocking of Core Business Logic**: Controllers, Mongoose schemas, virtual fields, and middleware execute with full HTTP network round-trips against local Express listener ports (`app.listen(0)`).
3. **Role & Ownership Boundaries**: Authorization boundaries (Customer vs Admin vs Unauthenticated) and data ownership rules (User A cannot view User B's orders) are explicitly tested with negative assertions.
4. **Concurrency & Atomic State**: Inventory deductions, order cancellations, and stock restoration are tested against race conditions and duplicate operations.

---

## 2. Test Suites Overview

### 2.1. Backend Test Suites (`server/tests/`)

| Suite File | Scope | Tests | Description |
| :--- | :--- | :---: | :--- |
| [`health.test.js`](file:///d:/ShopEasy-Ecommerce/server/tests/health.test.js) | Health & Routing | **2** | Verifies `/api/health` 200 uptime format and standard 404 response for undefined routes. |
| [`models.test.js`](file:///d:/ShopEasy-Ecommerce/server/tests/models.test.js) | Schema Validation | **5** | Validates Mongoose schema constraints, integer paise prices, email regex, and `toJSON()` password stripping. |
| [`auth.test.js`](file:///d:/ShopEasy-Ecommerce/server/tests/auth.test.js) | Auth & Security | **14** | Registration, duplicate email rejection (409), login verification, JWT token checks, role elevation prevention, and admin middleware. |
| [`products.test.js`](file:///d:/ShopEasy-Ecommerce/server/tests/products.test.js) | Catalog & Search | **13** | Category listing, default 8-item pagination, partial search, slug filtering, `price_asc`/`price_desc` sorting, admin CRUD, and in-stock filtering. |
| [`cart.test.js`](file:///d:/ShopEasy-Ecommerce/server/tests/cart.test.js) | Persistent Cart | **14** | Unauthenticated 401s, empty cart, invalid/negative quantities, stock limits, server-side price calculations, item removal, and deactivated item cleanup. |
| [`orders.test.js`](file:///d:/ShopEasy-Ecommerce/server/tests/orders.test.js) | Orders & Checkout | **15** | Empty cart checkout rejection, COD validation, shipping fields validation, stock deduction, order snapshot creation, cart clearing, order ownership (403), status checks, and stock restoration upon cancellation. |
| [`admin.test.js`](file:///d:/ShopEasy-Ecommerce/server/tests/admin.test.js) | Admin & Metrics | **12** | Admin role enforcement (403 for customers), real revenue aggregation (excluding cancelled sales), low-stock alerts, customer lists (no password hashes), and status transitions. |
| **Total Backend** | | **75** | **100% Pass Rate** |

---

### 2.2. Frontend Test Suite (`client/tests/`)

| Suite File | Scope | Tests | Description |
| :--- | :--- | :---: | :--- |
| [`frontend.test.js`](file:///d:/ShopEasy-Ecommerce/client/tests/frontend.test.js) | Client Logic | **10** | Registration & login validation, `formatINR` paise formatting, stock badges, search/category filtering, pagination bounds, cart calculation, route protection, and API error normalization. |
| **Total Frontend** | | **10** | **100% Pass Rate** |

---

## 3. How to Run the Tests

### 3.1. Running All Tests (Backend + Frontend)
From the project root:
```bash
npm run test:all
```

### 3.2. Running Backend Tests Only
From the project root:
```bash
npm run test:server
```
Or from within the `server/` directory:
```bash
cd server
npm test
```

### 3.3. Running Frontend Tests Only
From the project root:
```bash
npm run test:client
```
Or from within the `client/` directory:
```bash
cd client
npm test
```

### 3.4. Running a Single Test Suite
You can invoke any single test file using Node:
```bash
cd server
node --test tests/orders.test.js
node --test tests/auth.test.js
node --test tests/products.test.js
node --test tests/cart.test.js
node --test tests/admin.test.js
```

---

## 4. Verification of Core Security Tests

### 1. Role Elevation Prevention
- **Test**: `auth.test.js` -> `POST /api/auth/register creates customer and returns token`
- **Assertion**: When registering with `{ "role": "admin" }` in the request body, the server ignores the parameter and assigns `role: "customer"`. Attempts to elevate role via `PUT /api/auth/profile` are also ignored.

### 2. Customer Order Isolation (Ownership)
- **Test**: `orders.test.js` -> `GET /api/orders/:id rejects unauthorized customer access with 403`
- **Assertion**: When Customer B sends a request with their valid JWT to view Customer A's order ID, the endpoint returns `403 Forbidden` with `"Access denied: You are not authorized to view this order."`

### 3. Stock Oversell & Race Condition Prevention
- **Test**: `orders.test.js` -> `POST /api/orders rejects order if quantity exceeds available stock`
- **Assertion**: When an item has stock 1 and a checkout requests quantity 2, the order fails with `400 Bad Request` and no stock is deducted.

### 4. Single Stock Restoration on Cancellation
- **Test**: `orders.test.js` -> `PATCH /api/orders/:id/cancel prevents double cancellation and double stock restoration`
- **Assertion**: The first cancellation succeeds (status 200, stock restored). A second cancellation request returns `400 Bad Request` with `"Only orders in 'placed' status can be cancelled."` and does NOT increment stock again.
