# ShopEasy REST API Documentation

Comprehensive reference documentation for the ShopEasy E-Commerce backend API.

- **Base URL (Local)**: `http://localhost:5000/api`
- **Base URL (Production)**: `https://<your-render-service>.onrender.com/api`
- **Data Exchange Format**: JSON (`Content-Type: application/json`)
- **Monetary Unit**: Integer **Paise** (1 INR = 100 paise; e.g., ₹499.00 = `49900`)

---

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [Health Check API](#health-check-api)
3. [Product Catalog API](#product-catalog-api)
4. [Category API](#category-api)
5. [Shopping Cart API](#shopping-cart-api)
6. [Checkout & Orders API](#checkout--orders-api)
7. [Administrator APIs](#administrator-apis)
8. [Standard Error Responses](#standard-error-responses)

---

## Authentication & Authorization

All authenticated endpoints require an `Authorization` header containing a JSON Web Token (JWT) in Bearer format:
```http
Authorization: Bearer <your-jwt-token>
```

### 1. Register Customer
- **Endpoint**: `POST /api/auth/register`
- **Access**: Public (Rate-limited: 30 requests / 15 min)
- **Description**: Registers a new customer account. Ignores any client-supplied role to prevent role elevation; all registered accounts are assigned `role: "customer"`.
- **Request Body**:
  ```json
  {
    "name": "Aarav Sharma",
    "email": "aarav.sharma@example.com",
    "password": "SecurePassword123!",
    "passwordConfirm": "SecurePassword123!",
    "phone": "+91 9876543210",
    "city": "Bengaluru"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "670f5e1432f483a6b57d0001",
      "name": "Aarav Sharma",
      "email": "aarav.sharma@example.com",
      "role": "customer",
      "phone": "+91 9876543210",
      "city": "Bengaluru",
      "createdAt": "2026-10-17T12:00:00.000Z"
    }
  }
  ```

### 2. Customer & Admin Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public (Rate-limited: 30 requests / 15 min)
- **Description**: Authenticates user credentials using bcrypt hash comparison.
- **Request Body**:
  ```json
  {
    "email": "aarav.sharma@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logged in successfully.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "670f5e1432f483a6b57d0001",
      "name": "Aarav Sharma",
      "email": "aarav.sharma@example.com",
      "role": "customer"
    }
  }
  ```

### 3. Get Current User Profile
- **Endpoint**: `GET /api/auth/me`
- **Access**: Authenticated (Bearer Token required)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "670f5e1432f483a6b57d0001",
      "name": "Aarav Sharma",
      "email": "aarav.sharma@example.com",
      "role": "customer",
      "phone": "+91 9876543210",
      "city": "Bengaluru"
    }
  }
  ```

### 4. Update Profile
- **Endpoint**: `PUT /api/auth/profile`
- **Access**: Authenticated
- **Description**: Updates profile details (name, phone, address, city, pinCode). Rejects attempts to elevate `role`.
- **Request Body**:
  ```json
  {
    "name": "Aarav Sharma",
    "phone": "+91 9876543211",
    "address": "42 MG Road, Indiranagar",
    "city": "Bengaluru",
    "pinCode": "560038"
  }
  ```
- **Success Response (200 OK)**: Returns updated user profile.

### 5. Logout
- **Endpoint**: `POST /api/auth/logout`
- **Access**: Authenticated
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully."
  }
  ```

---

## Health Check API

### Verify API & Cluster Status
- **Endpoint**: `GET /api/health`
- **Access**: Public
- **Success Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "service": "ShopEasy API",
    "timestamp": "2026-10-17T12:00:00.000Z",
    "uptime": 124.56
  }
  ```

---

## Product Catalog API

### 1. List Products (Search, Filter, Sort, Paginate)
- **Endpoint**: `GET /api/products`
- **Access**: Public
- **Query Parameters**:
  | Parameter | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `page` | Integer | `1` | Page number |
  | `limit` | Integer | `8` | Number of products per page (default: 8) |
  | `search` | String | - | Partial case-insensitive match on product name or description |
  | `category`| String | - | Filter by category slug (e.g., `electronics-gadgets`) |
  | `sort` | String | `createdAt_desc` | `price_asc`, `price_desc`, `name_asc`, `createdAt_desc` |
  | `featured`| Boolean| - | Filter by featured status (`true`/`false`) |
  | `inStock` | Boolean| - | Only return items with stock > 0 |
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 8,
    "total": 16,
    "page": 1,
    "pages": 2,
    "products": [
      {
        "_id": "670f5e1432f483a6b57d0010",
        "name": "AcousticPro Wireless Noise-Cancelling Headphones",
        "slug": "acousticpro-wireless-headphones",
        "description": "Over-ear active noise cancelling Bluetooth 5.3 headphones with 40-hour battery life.",
        "price": 499900,
        "priceInRupees": "4999.00",
        "category": {
          "_id": "670f5e1432f483a6b57d000a",
          "name": "Electronics & Gadgets",
          "slug": "electronics-gadgets"
        },
        "stock": 45,
        "imageUrl": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
        "featured": true,
        "isActive": true
      }
    ]
  }
  ```

### 2. Get Product By ID or Slug
- **Endpoint**: `GET /api/products/:id`
- **Access**: Public
- **Path Variable**: Valid MongoDB ObjectId or unique product slug.
- **Success Response (200 OK)**: Returns full product document with populated category.

---

## Category API

### List Categories
- **Endpoint**: `GET /api/categories`
- **Access**: Public
- **Description**: Returns all active categories with associated product counts.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 4,
    "categories": [
      {
        "_id": "670f5e1432f483a6b57d000a",
        "name": "Electronics & Gadgets",
        "slug": "electronics-gadgets",
        "description": "Smartphones, headphones, laptops, and consumer electronics.",
        "imageUrl": "https://images.unsplash.com/...",
        "isActive": true
      }
    ]
  }
  ```

---

## Shopping Cart API

All cart operations are tied to the authenticated user ID extracted from JWT. Prices and totals are strictly calculated on the server.

### 1. Get Cart
- **Endpoint**: `GET /api/cart`
- **Access**: Authenticated Customer
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "cart": {
      "_id": "670f5e1432f483a6b57d0020",
      "user": "670f5e1432f483a6b57d0001",
      "items": [
        {
          "_id": "670f5e1432f483a6b57d0021",
          "product": {
            "_id": "670f5e1432f483a6b57d0010",
            "name": "AcousticPro Wireless Noise-Cancelling Headphones",
            "slug": "acousticpro-wireless-headphones",
            "price": 499900,
            "stock": 45,
            "imageUrl": "https://images.unsplash.com/...",
            "isActive": true
          },
          "quantity": 1,
          "itemTotal": 499900
        }
      ],
      "totalItems": 1,
      "subtotal": 499900
    }
  }
  ```

### 2. Add Item to Cart
- **Endpoint**: `POST /api/cart`
- **Access**: Authenticated Customer
- **Request Body**:
  ```json
  {
    "productId": "670f5e1432f483a6b57d0010",
    "quantity": 1
  }
  ```
- **Validations**:
  - Quantity must be a positive integer >= 1.
  - Requested quantity + existing cart quantity cannot exceed available stock.
  - Inactive products are rejected (404).

### 3. Update Item Quantity
- **Endpoint**: `PUT /api/cart/:itemId`
- **Access**: Authenticated Customer
- **Request Body**:
  ```json
  {
    "quantity": 2
  }
  ```

### 4. Remove Item from Cart
- **Endpoint**: `DELETE /api/cart/:itemId`
- **Access**: Authenticated Customer
- **Success Response (200 OK)**: Returns updated cart state.

---

## Checkout & Orders API

### 1. Create Order (Cash on Delivery)
- **Endpoint**: `POST /api/orders`
- **Access**: Authenticated Customer
- **Description**: Atomically deducts inventory stock (or rollback on failure), creates immutable order snapshot, and clears the customer's cart.
- **Request Body**:
  ```json
  {
    "shippingDetails": {
      "fullName": "Aarav Sharma",
      "phone": "+91 9876543210",
      "address": "42 MG Road, Indiranagar",
      "city": "Bengaluru",
      "pinCode": "560038"
    },
    "paymentMethod": "cod"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Order placed successfully with Cash on Delivery.",
    "order": {
      "_id": "670f5e1432f483a6b57d0030",
      "orderNumber": "SE-20261017-4821",
      "user": "670f5e1432f483a6b57d0001",
      "items": [
        {
          "product": "670f5e1432f483a6b57d0010",
          "name": "AcousticPro Wireless Noise-Cancelling Headphones",
          "slug": "acousticpro-wireless-headphones",
          "price": 499900,
          "imageUrl": "https://images.unsplash.com/...",
          "quantity": 1,
          "subtotal": 499900
        }
      ],
      "totals": {
        "itemsTotal": 499900,
        "shippingFee": 0,
        "tax": 0,
        "grandTotal": 499900
      },
      "paymentMethod": "cod",
      "paymentStatus": "pending",
      "orderStatus": "placed",
      "createdAt": "2026-10-17T12:00:00.000Z"
    }
  }
  ```

### 2. Get My Orders
- **Endpoint**: `GET /api/orders`
- **Access**: Authenticated Customer
- **Success Response (200 OK)**: Returns array of orders belonging strictly to the requesting user.

### 3. Get Order Details
- **Endpoint**: `GET /api/orders/:id`
- **Access**: Authenticated Owner or Administrator
- **Path Variable**: MongoDB ObjectId or unique orderNumber (`SE-YYYYMMDD-XXXX`).

### 4. Cancel Order
- **Endpoint**: `PATCH /api/orders/:id/cancel`
- **Access**: Authenticated Customer (Owner)
- **Description**: Customers can only cancel orders in `placed` status. Restores inventory stock exactly once. Double cancellation attempts return 400. Orders that are `shipped`, `delivered`, or `cancelled` cannot be cancelled.

---

## Administrator APIs

All `/api/admin/*` endpoints require `role: "admin"` in the verified JWT payload. Regular customers receive `403 Forbidden`.

### 1. Dashboard Statistics
- **Endpoint**: `GET /api/admin/stats`
- **Description**: Aggregates total products, total customers, total orders, active sales (excluding cancelled orders), recent 5 orders, and low-stock alerts (stock <= 5).
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "stats": {
      "totalProducts": 16,
      "totalCustomers": 12,
      "totalOrders": 24,
      "totalSales": 12845000,
      "totalSalesRupees": "128450.00",
      "recentOrders": [...],
      "lowStockProducts": [...]
    }
  }
  ```

### 2. Admin Order Management
- **List All Orders**: `GET /api/admin/orders?page=1&limit=20&status=placed&search=SE-2026`
- **Update Order Status**: `PATCH /api/admin/orders/:id/status`
  - Body: `{ "orderStatus": "shipped" }`
  - Valid transitions: `placed -> shipped -> delivered` or `placed -> cancelled`.
  - Cancelling an order restores inventory stock.

### 3. Admin Customer List
- **Endpoint**: `GET /api/admin/customers`
- **Description**: Returns customer profiles without exposing password hashes.

### 4. Admin Product CRUD
- **Create**: `POST /api/products` (Requires admin)
- **Update**: `PUT /api/products/:id` (Requires admin)
- **Delete**: `DELETE /api/products/:id` (Requires admin)

### 5. Admin Category CRUD
- **Create**: `POST /api/categories` (Requires admin)
- **Update**: `PUT /api/categories/:id` (Requires admin)
- **Delete**: `DELETE /api/categories/:id` (Requires admin; rejected with 400 if products reference the category)

---

## Standard Error Responses

ShopEasy enforces consistent error structures across all controllers:

```json
{
  "success": false,
  "message": "Human-readable description of error.",
  "errors": ["Specific field validation error details (optional)"]
}
```

| HTTP Status | Meaning | Typical Trigger |
| :--- | :--- | :--- |
| `400 Bad Request` | Validation failure / invalid input | Missing required fields, insufficient stock, invalid status transition |
| `401 Unauthorized` | Missing / invalid authentication | No Bearer token or token expired |
| `403 Forbidden` | Access denied | Customer attempting to access admin route or other customer's order |
| `404 Not Found` | Entity not found | Non-existent product ID, empty cart, invalid endpoint |
| `409 Conflict` | Unique constraint violation | Attempting to register with an already existing email |
| `429 Too Many Requests`| Rate limit exceeded | Exceeding 30 auth requests per 15 minutes |
| `500 Server Error` | Unhandled server error | Handled by centralized error handler (stack hidden in production) |
