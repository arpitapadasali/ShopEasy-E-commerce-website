# ShopEasy E-Commerce Architecture & Project Roadmap

## 1. Project Overview
ShopEasy is a scalable, modern full-stack e-commerce web application engineered with a clean separation of concerns between client presentation, API server services, and data persistence.

---

## 2. Technology Stack

### Frontend (`/client`)
- **Library/Framework**: React.js 18
- **Bundler/Dev Server**: Vite
- **Routing**: React Router DOM (v6)
- **HTTP Client**: Axios with configured base client & interceptors
- **Icons**: Lucide React
- **Styling**: Custom responsive CSS design tokens (`variables.css`, `global.css`) without external UI framework bloat

### Backend (`/server`)
- **Runtime**: Node.js (v20+)
- **Framework**: Express.js
- **Module System**: ECMAScript Modules (`"type": "module"`)
- **Security**: Helmet (secure HTTP headers), bcryptjs (password hashing)
- **CORS**: Origin-controlled CORS middleware
- **Body Parsing**: Native Express JSON & URL-encoded parser
- **Logging**: Morgan HTTP logger
- **Testing**: Node.js Native Test Runner (`node:test`, `node:assert`)

### Database (Stage 2 Integration)
- **Database**: MongoDB Atlas (Cloud database)
- **ODM**: Mongoose 8.x
- **Models**:
  - `User`: User profile, authentication credentials (hashed), role management (`customer` vs `admin`), address & contact details.
  - `Category`: Catalog categorization with URL-friendly slugs, descriptions, images, and active status.
  - `Product`: Catalog items linked to Category with pricing, stock, featured flags, and images.
  - `Cart`: Active user shopping carts with product references and quantity tracking.
  - `Order`: Completed orders containing item snapshots, pricing at time of purchase, shipping address, payment method, order status, and total breakdowns.

---

## 3. Monetary Representation: Integer Paise

In ShopEasy, all monetary amounts (product prices, item subtotals, shipping fees, taxes, and order grand totals) are stored and calculated as **positive integers in Paise** (1 INR = 100 Paise).

### Why Paise?
In standard IEEE 754 floating-point arithmetic (used by JavaScript `Number`), operations with decimals introduce rounding errors:
```javascript
0.1 + 0.2 === 0.30000000000000004 // true in JavaScript!
```
In financial transactions, accumulated floating-point drift can cause subtle reconciliation discrepancies during discounts, tax computation, and payment gateway verification. Storing values in integer paise eliminates fractional cents/paise errors:
- **₹499.00** is stored as **`49900`** paise.
- **₹1,499.50** is stored as **`149950`** paise.
- Display conversion: `priceInRupees = (price / 100).toFixed(2)` (implemented as virtual properties on `Product` and `Order` models).

---

## 4. Directory Layout

```
ShopEasy-Ecommerce/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Reusable atomic UI components
│   │   │   └── layout/         # Structural components (Navbar, Footer, Layout)
│   │   ├── config/             # Environment constants and client settings
│   │   ├── context/            # Global React state providers
│   │   ├── pages/              # Routed screen views (HomePage)
│   │   ├── routes/             # React Router configuration
│   │   ├── services/           # Axios API service instances and endpoints
│   │   ├── styles/             # CSS design tokens, resets, utilities
│   │   ├── App.jsx             # Top-level application component
│   │   └── main.jsx            # React DOM mounting entry point
│   ├── tests/                  # Frontend test configurations and tests
│   ├── .env                    # Active frontend environment variables
│   ├── .env.example            # Example frontend environment variables
│   ├── index.html              # Vite HTML template
│   ├── package.json            # Client dependencies and scripts
│   └── vite.config.js          # Vite build and proxy configuration
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js     # MongoDB Atlas connection manager with credential masking
│   │   │   ├── db.js           # Database export alias
│   │   │   └── env.js          # Environment configuration & validation
│   │   ├── controllers/        # Request handling and business logic
│   │   ├── middleware/         # Error handling, auth, validation
│   │   ├── models/             # Mongoose schemas (User, Category, Product, Cart, Order)
│   │   ├── routes/             # Express API route declarations
│   │   ├── scripts/
│   │   │   └── seedDatabase.js # Safe, idempotent database seeder
│   │   ├── app.js              # Express app setup and middleware pipeline
│   │   └── server.js           # HTTP server startup and lifecycle listeners
│   ├── tests/
│   │   ├── health.test.js      # Health endpoint and 404 tests
│   │   └── models.test.js      # Mongoose schema validations & virtuals tests
│   ├── .env                    # Active server environment variables
│   ├── .env.example            # Example server environment variables
│   └── package.json            # Server dependencies and scripts
├── docs/
│   └── architecture.md         # Architecture blueprint and roadmap
├── postman/
│   └── ShopEasy.postman_collection.json # API collection for verification
├── .gitignore                  # Git exclusions for dependencies, env, logs
├── package.json                # Root package for workspace orchestration
└── README.md                   # Setup guide and instructions
```

---

## 5. Authentication & Token Security Architecture

### Bearer Token Strategy
ShopEasy implements stateless JSON Web Token (JWT) authentication using standard HTTP `Authorization: Bearer <token>` headers.
- **Payload**: Contains minimal identifiers (`id` and `role`). Sensitive data (passwords, hashes, PII) is never embedded in token payloads.
- **Signing**: Signed via HMAC-SHA256 with a 32+ character secret key (`JWT_SECRET`).
- **Expiration**: Configured with a bounded time-to-live (`JWT_EXPIRES_IN`, default 7 days).

### Token-Storage Risks & Mitigation
1. **`localStorage` Risks**:
   - **XSS (Cross-Site Scripting)**: If an attacker injects malicious JavaScript, they can access `localStorage.getItem('shopeasy_token')`.
   - **Mitigations implemented**:
     - Strict React JSX escaping prevents raw HTML script injection.
     - Content Security Policy (CSP) headers enabled via Express `helmet()`.
     - Strict input sanitization across all request bodies.
2. **`httpOnly` Cookie Alternative**:
   - In environments where XSS risks outweigh CSRF concerns, `httpOnly`, `Secure`, `SameSite=Strict` cookies can prevent JavaScript access to tokens. However, cookie-based authentication requires CSRF tokens and cross-origin cookie management.
   - For our decoupled single-page application and upcoming mobile REST API compatibility, Bearer tokens with strict CORS and CSP headers provide optimal ergonomics and defense-in-depth.

### Stateless Logout Limitations & Mitigation
- **Limitation**: In a pure stateless JWT model, the server does not maintain an active session store in memory or database. When a client calls `POST /api/auth/logout`, the server acknowledges the request and the client deletes the token from local storage. However, the cryptographic token itself remains technically valid until its `exp` timestamp.
- **Mitigation Architecture**:
  - Bound token lifespan (`JWT_EXPIRES_IN`).
  - Active user verification: On every protected request, `protect` middleware verifies that the user still exists in MongoDB (`User.findById(decoded.id)`). Deleting or deactivating a user immediately invalidates access regardless of token validity.
  - Optional Redis token blacklist can be integrated in enterprise environments for immediate token invalidation before expiry.

---

## 6. Multi-Stage Project Roadmap
- **Stage 1 (Complete)**: Foundation, folder structure, tooling, Vite, React Router, Express setup, security headers, CORS, centralized error handling, `/api/health`.
- **Stage 2 (Complete)**: MongoDB Atlas configuration, Mongoose schemas (User, Category, Product, Cart, Order), integer paise calculations, safe database seed script, dev-admin generation, and model verification.
- **Stage 3 (Complete)**: Complete authentication and authorization API (register, login, logout, me, profile), bcrypt password hashing, JWT bearer tokens, rate limiting, role-based access control, AuthContext, ProtectedRoute, AdminRoute, Login, Register, Profile, and Admin pages.
- **Stage 4 (Complete)**: Product and Category REST APIs (pagination, partial name search, category filter, price asc/desc sorting, in-stock filtering, admin CRUD), frontend catalog browsing with Search, Category filter pills, Product Grid, Product Cards, Product Details page with quantity selector and stock badges.
- **Stage 5**: Shopping cart API, checkout workflow, Order processing, and payment gateway integration.
