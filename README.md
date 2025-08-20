# SHAY ROOMS — Full-stack Booking App

A full-stack room booking application with React (client) and Node/Express + MongoDB (server), Google login (Firebase), and Razorpay payments.

## Table of Contents
1. Overview
2. Features
3. Architecture
4. Tech Stack & Dependencies
5. Local Setup
6. Environment Variables
7. Running the App
8. Core Functionality
9. API Endpoints (Summary)
10. Payments (Razorpay)
11. Authentication (Email/Password + Google)
12. Common Workflows
13. Project Scripts
14. Security Notes
15. Troubleshooting
16. Roadmap

---

## 1) Overview
- SPA client served by Create React App.
- REST API server with Express, MongoDB (Mongoose).
- Auth via email/password and Google Sign-in (Firebase).
- Payments via Razorpay Checkout + server-side verification.

## 2) Features
- Room listing, detail pages, and booking flow.
- Authentication: email/password and Google OAuth (Firebase popup).
- Stores app user session in localStorage (app JWT + user object with _id).
- Payment: Razorpay order creation, checkout, verification; fallback link.
- Basic admin endpoints and Swagger docs for API exploration.
- Email utility via SMTP (Nodemailer) for operational emails.

## 3) Architecture
- **client/**: React app (CRA) with screens and components.
- **server/**: Express API, routes, controllers, models.
- **MongoDB**: Rooms, Users, Bookings persisted via Mongoose.
- **Razorpay**: Order creation and signature verification.
- **Firebase**: Google sign-in on client; backend upserts/links users.

## 4) Tech Stack & Dependencies

### Client
- React 19, react-router-dom, axios
- Firebase Web SDK (Google auth)
- UI libs: antd, react-bootstrap, react-spinners
- moment, sweetalert2

### Server
- express, mongoose, dotenv, helmet, compression, cors, morgan
- jsonwebtoken (JWT)
- express-rate-limit
- bcryptjs (password hashing)
- razorpay (server SDK)
- nodemailer (SMTP email)
- swagger-jsdoc, swagger-ui-express (API docs)

## 5) Local Setup
1. Prereqs: Node 18+, npm; a MongoDB connection string; Razorpay test keys; Gmail/App password (or SMTP provider).
2. Install dependencies:
   - Server: `cd server && npm install`
   - Client: `cd client && npm install`
3. Create `.env` in `server/` (see Environment Variables below).
4. Ensure `client/package.json` has `"proxy": "http://localhost:5000"`.

## 6) Environment Variables (server/.env)
- PORT: Server port, e.g., 5000
- MONGO_URI: Mongo connection string
- JWT_SECRET: Secret for app JWT signing
- RZP_KEY_ID: Razorpay key id
- RZP_KEY_SEC: Razorpay key secret
- SMTP_HOST: SMTP host
- SMTP_PORT: SMTP port (e.g., 465 for SSL)
- SMTP_USER: SMTP username
- SMTP_PASS: SMTP password or app password
- MAIL_FROM: From header, e.g., "Shay Rooms <no-reply@yourdomain>"
- ADMIN_EMAIL: Admin email address

Note: Store secrets securely and never commit real creds.

## 7) Running the App
- Start server:
  - `cd server`
  - `npm start`
  - API docs at http://localhost:5000/api/docs
- Start client:
  - `cd client`
  - `npm start`
  - App at http://localhost:3000

## 8) Core Functionality

### Rooms
- List rooms: client fetches `/api/rooms/getallrooms`.
- Get room by id: `/api/rooms/getroombyid/:id`.

### Authentication
- Email/password:
  - Register: `/api/users/register`
  - Login: `/api/users/login`
- Google login (Firebase popup on client):
  - Client obtains Google user via Firebase, then calls `/api/users/google-login` to upsert/login and receive app JWT + user object.
- Client stores:
  - `localStorage.currentUser` — app user object with `_id`, `name`, `email`, `isAdmin`
  - `localStorage.token` — app JWT for authenticated calls

### Booking
- Booking screen calculates dates and total.
- Pay Now triggers Razorpay order, opens checkout, verifies payment, then books room via `/api/bookings/bookroom`.

## 9) API Endpoints (Summary)
- Rooms:
  - `GET /api/rooms/getallrooms`
  - `GET /api/rooms/getroombyid/:id`
- Users:
  - `POST /api/users/register`
  - `POST /api/users/login`
  - `POST /api/users/google-login` (Google upsert/login)
  - `GET /api/users/getallusers` (admin summary)
  - `GET /api/test/test-email` (SMTP check)
- Booking:
  - `POST /api/bookings/bookroom`
- Payment:
  - `POST /api/payment/create-order`
  - `POST /api/payment/verify-payment`
  - `POST /api/payment/create-payment-link` (fallback)
  - `GET /api/payment/payment-link/:id` (status)

See Swagger: http://localhost:5000/api/docs

## 10) Payments (Razorpay)
- Client requests order via `/api/payment/create-order` with `amount` (in paise).
- Client initializes `window.Razorpay` checkout with the returned `order.id`.
- On success, client calls `/api/payment/verify-payment` with `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`.
- If verification succeeds, client proceeds to `/api/bookings/bookroom`.
- Fallback path uses Payment Links when Checkout/SDK fails.

## 11) Authentication (Email/Password + Google)

### Email/Password
- `/api/users/register` validates name/email/password, hashes password (bcrypt), stores user, returns app JWT.
- `/api/users/login` validates credentials, returns app JWT and user object.

### Google (Firebase)
- Client uses Firebase `signInWithPopup` with `GoogleAuthProvider`.
- After popup success, client calls `/api/users/google-login` with `{ email, name, uid }`.
- Server upserts user (sets `provider=google`, stores `googleUid`), signs app JWT.
- Client stores returned app user + token in localStorage.
- This ensures app features that require `currentUser._id` work (e.g., booking, Pay Now).

## 12) Common Workflows

### User Registration/Login (local)
1. User enters email/password → POST `/api/users/login`
2. Store `{ user, token }` in localStorage

### Google Login
1. User clicks Google button → Firebase popup → `user`
2. Client POST `/api/users/google-login` with `{ email, name, uid }`
3. Store `{ user, token }` from server

### Booking & Payment
1. User selects dates → Booking screen computes amount
2. Click Pay Now → create Razorpay order → open checkout
3. On success → verify payment → call `/api/bookings/bookroom`

## 13) Project Scripts

### Client
- `npm start` — start CRA dev server
- `npm build` — production build

### Server
- `npm start` — start Express server

## 14) Security Notes
- Do not commit real secrets. Use env variables or secret managers.
- Consider httpOnly cookies for JWT and refresh tokens for session hardening.
- Validate inputs on all endpoints; keep rate limits.
- In production, verify Firebase ID tokens on the backend when using Google auth.
- Use HTTPS and secure headers (helmet already enabled).

## 15) Troubleshooting
- Google popup blocked: use redirect flow (`signInWithRedirect`).
- "Please login to book a room": ensure `currentUser` is the app user (has `_id`), not raw Firebase user.
- Razorpay SDK missing: ensure script loads (`https://checkout.razorpay.com/v1/checkout.js`).
- CORS issues: client should proxy to server (`proxy` in client package.json).
- Mongo connection errors: check `MONGO_URI` and network access.

## 16) Roadmap (Advanced)
- JWT refresh tokens + httpOnly cookies
- Webhooks for payments; idempotent reconciliation
- RBAC, audit logs, and admin dashboard
- Atomic booking with transactions to prevent double-booking
- Coupon codes, refunds, invoices (PDF)
- File storage via S3/Cloud Storage + CDN
- Tests: Jest/Supertest (server), Cypress/Playwright (E2E)

---

Contributions welcome. For questions or support, open an issue or contact the maintainer.