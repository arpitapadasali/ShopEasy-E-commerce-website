# ShopEasy Production Cloud Deployment Guide

A step-by-step production deployment manual for hosting the **ShopEasy** full-stack application using **Render** (Backend), **Vercel** (Frontend), and **MongoDB Atlas** (Database).

---

## Architecture Overview

```
                      ┌───────────────────────────────────────────────┐
                      │                End User Device                │
                      │               (Browser / Mobile)              │
                      └──────────────────────┬────────────────────────┘
                                             │
                       HTTPS Requests        │
                                             ▼
                      ┌───────────────────────────────────────────────┐
                      │                 Vercel CDN                    │
                      │       React 18 SPA (Vite / client/dist)       │
                      │           URL: https://*.vercel.app           │
                      └──────────────────────┬────────────────────────┘
                                             │
                        REST API Calls       │  (VITE_API_URL)
                        with CORS & JWT      │
                                             ▼
                      ┌───────────────────────────────────────────────┐
                      │                 Render Cloud                  │
                      │            Express / Node.js Engine           │
                      │          URL: https://*.onrender.com          │
                      └──────────────────────┬────────────────────────┘
                                             │
                         TLS Connection      │  (MONGODB_URI)
                         Connection Pool     │
                                             ▼
                      ┌───────────────────────────────────────────────┐
                      │              MongoDB Atlas Cloud              │
                      │          Replica Set (Standard / M0)          │
                      └───────────────────────────────────────────────┘
```

---

## 1. MongoDB Atlas Setup

### 1.1. Create a Free Cluster
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new organization and project (e.g. `ShopEasy`).
3. Deploy a free **M0 Shared Cluster** in your preferred region (e.g. `AWS - Mumbai (ap-south-1)`).

### 1.2. Configure Database Access (User Credentials)
1. In the Atlas sidebar, navigate to **Security** -> **Database Access**.
2. Click **Add New Database User**.
3. Choose **Password** authentication.
4. Set a username (e.g. `shopeasy_admin`) and a strong alphanumeric password.
5. Grant the user **Read and write to any database** (or specific `shopeasy` database).
6. Save the user.

### 1.3. Configure Network Access (IP Whitelist)
Because cloud platforms like Render allocate dynamic outbound IP addresses, you must whitelist global access:
1. In the Atlas sidebar, navigate to **Security** -> **Network Access**.
2. Click **Add IP Address**.
3. Click **Allow Access from Anywhere** (`0.0.0.0/0`).
4. Click **Confirm**.

### 1.4. Retrieve Connection String
1. In **Deployment** -> **Database**, click **Connect** on your cluster.
2. Select **Drivers** (Node.js).
3. Copy the SRV connection URI:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/shopeasy?retryWrites=true&w=majority
   ```
4. Replace `<username>` and `<password>` with your database user credentials.

---

## 2. Backend Deployment on Render

### 2.1. Create Web Service
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository containing the `ShopEasy-Ecommerce` code.
4. Configure the following service settings:
   - **Name**: `shopeasy-backend` (or your choice)
   - **Region**: Choose the region closest to your Atlas cluster (e.g., `Singapore` or `Frankfurt`)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### 2.2. Configure Environment Variables
Under the **Environment Variables** section on Render, add:

| Key | Suggested Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations & error suppression |
| `PORT` | `10000` | Render standard port (Render injects this automatically) |
| `MONGODB_URI` | `mongodb+srv://.../shopeasy?...` | Your full Atlas connection string |
| `CLIENT_URL` | `https://your-shopeasy-app.vercel.app` | Deployed frontend URL on Vercel |
| `JWT_SECRET` | `<random-64-character-string>` | Strong secret key for signing JWTs |
| `JWT_EXPIRES_IN`| `7d` | JWT token validity lifespan |
| `CREATE_DEV_ADMIN`| `true` *(first run)* | Seeds initial admin account (`admin@shopeasy.local`) |

### 2.3. Health Check Path
Under **Advanced**:
- Set **Health Check Path** to: `/api/health`

### 2.4. Deploy & Verify
1. Click **Create Web Service**.
2. Monitor the build logs. When deployment completes, note your backend public URL:
   `https://shopeasy-backend.onrender.com`
3. Test health check in your browser or curl:
   ```bash
   curl https://shopeasy-backend.onrender.com/api/health
   ```
   Expected response: `{"status":"ok","service":"ShopEasy API",...}`

---

## 3. Frontend Deployment on Vercel

### 3.1. Import Project
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Select your `ShopEasy-Ecommerce` repository.

### 3.2. Project Configuration
Configure project build parameters:
- **Framework Preset**: `Vite`
- **Root Directory**: Click edit and select `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3.3. Environment Variables
Add the API connection variable:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://shopeasy-backend.onrender.com/api` | Your deployed Render backend API URL |

### 3.4. Single Page Application (SPA) Routing Configuration
The client repository includes [`client/vercel.json`](file:///d:/ShopEasy-Ecommerce/client/vercel.json) to rewrite all incoming URLs to `/index.html`:
```json
{
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```
This ensures direct navigation and browser refreshes on routes like `/cart`, `/checkout`, `/orders`, or `/admin` function without 404 errors.

### 3.5. Deploy & Connect
1. Click **Deploy**.
2. When deployment succeeds, copy your Vercel URL:
   `https://shopeasy-ecommerce.vercel.app`
3. Return to **Render** -> **Environment Variables**, ensure `CLIENT_URL` matches this exact Vercel URL, and trigger a manual redeploy so production CORS permits requests from your frontend.

---

## 4. Initial Database Seeding

Once your Render backend is connected to MongoDB Atlas:
1. Set `CREATE_DEV_ADMIN=true` in Render environment variables.
2. If you have local access to Atlas, you can seed the full 16-product catalog directly from your local terminal:
   ```bash
   cd server
   # Ensure server/.env has the production MONGODB_URI
   npm run seed
   ```
3. Alternatively, you can log in as `admin@shopeasy.local` / `AdminSecurePass123!` and use the Admin Dashboard UI to create and manage categories and products interactively.

---

## 5. Post-Deployment Verification Checklist

- [ ] **Health Endpoint**: `GET https://<render-url>/api/health` returns HTTP 200 `status: "ok"`.
- [ ] **Catalog Display**: Home page on Vercel loads products with formatted INR currency (`₹4,999.00`).
- [ ] **User Registration**: Register a new customer; verify JWT token is stored in localStorage.
- [ ] **Cart Flow**: Add product to cart, update quantity, verify server total calculation.
- [ ] **Checkout Flow**: Complete COD checkout; verify inventory stock decrements.
- [ ] **Order Cancellation**: Cancel order from "My Orders"; verify inventory restores.
- [ ] **Admin Security**: Attempt to view `/admin` as a standard customer; verify redirection to `/unauthorized` and 403 API protection.
- [ ] **Browser Refresh**: Refresh `/orders` and `/cart`; verify Vercel loads the React SPA correctly without 404s.

---

## 6. Troubleshooting Common Production Issues

### Issue 1: CORS Blocked (Origin Not Allowed)
- **Symptom**: Browser console logs `Access to fetch has been blocked by CORS policy`.
- **Cause**: The `CLIENT_URL` environment variable on Render does not match your Vercel domain (or includes trailing slashes).
- **Fix**: Update Render `CLIENT_URL` to exact Vercel domain: `https://your-app.vercel.app` (no trailing slash) and trigger a redeploy.

### Issue 2: Render Free Tier Cold Starts
- **Symptom**: Initial request takes 30-50 seconds to respond.
- **Cause**: Render free tier spins down web services after 15 minutes of inactivity.
- **Fix**: The client UI includes responsive loading spinners and skeleton loaders to inform users during wake-up. For zero spin-down, upgrade Render service to `Starter`.

### Issue 3: MongoDB Atlas Network Rejection (`MongoServerSelectionError`)
- **Symptom**: Render backend logs show `MongoServerSelectionError: connection timed out`.
- **Cause**: Atlas Network Access does not permit connections from dynamic Render IPs.
- **Fix**: Add `0.0.0.0/0` in MongoDB Atlas Network Access.
