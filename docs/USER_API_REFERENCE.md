# FastMotion User API — Endpoint Reference

> Base URL: `/api/v1` (configured in `main.ts`)
> Auth: JWT Bearer token (except auth & webhook endpoints)

---

## 1. AUTH — `/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register new customer (PRD 5.1) |
| POST | `/auth/login` | ❌ | Login with email + password |
| POST | `/auth/verify-email` | ❌ | Verify email OTP after registration |
| POST | `/auth/resend-otp` | ❌ | Resend phone OTP |
| POST | `/auth/resend-email-otp` | ❌ | Resend email OTP |
| POST | `/auth/forgotPassword` | ❌ | Request password reset OTP |
| POST | `/auth/resetPassword` | ❌ | Reset password with OTP |
| POST | `/auth/googleSignIn` | ❌ | Google OAuth sign-in |
| POST | `/auth/googleSignUp` | ❌ | Google OAuth sign-up |
| POST | `/auth/logout` | ✅ | Logout + revoke tokens |

### Register Body
```json
{
  "firstName": "Adebayo",
  "lastName": "Ogunlesi",
  "email": "user@email.com",
  "phone": "+2348012345678",
  "password": "Password@123",
  "confirmPassword": "Password@123",
  "profilePhoto": "https://..." // optional
}
```

### Login Body
```json
{
  "email": "user@email.com",
  "password": "Password@123",
  "fcmToken": "optional_firebase_token"
}
```

---

## 2. ACCOUNT — `/account`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/account/me` | ✅ | Get current user profile |
| PUT | `/account/me` | ✅ | Update profile (name, phone, photo, location) |
| PUT | `/account/notifications` | ✅ | Update notification preferences |
| PUT | `/account/fcmToken` | ✅ | Update Firebase Cloud Messaging token |
| POST | `/account/upload` | ✅ | Upload profile photo (multipart/form-data) |
| POST | `/account/delete` | ✅ | Soft-delete/deactivate account |

---

## 3. DELIVERY — `/delivery`

### Core CRUD

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/delivery` | ✅ | Create delivery request (quick or scheduled) |
| POST | `/delivery/estimate` | ✅ | Get price estimate without creating |
| GET | `/delivery` | ✅ | List my deliveries (with status filter, pagination) |
| GET | `/delivery/active/current` | ✅ | **NEW** Get currently active delivery |
| GET | `/delivery/history/all` | ✅ | Get completed delivery history |
| GET | `/delivery/:id` | ✅ | Get delivery by ID (with rider, rating, dispute) |
| GET | `/delivery/:id/track` | ✅ | Track delivery (rider location, ETA) |
| DELETE | `/delivery/:id` | ✅ | Cancel delivery (with refund calculation) |

### PINs (PRD 6.4, 6.5)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/delivery/:id/pickup-pin` | ✅ | Get pickup PIN (after payment confirmed) |
| GET | `/delivery/:id/delivery-pin` | ✅ | Get delivery PIN (after pickup) |

### Quick Delivery Payment at Pickup (PRD 6.3)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/delivery/:id/initiate-pickup-payment` | ✅ | Initiate payment when rider arrives |
| POST | `/delivery/:id/confirm-pickup-payment` | ✅ | Confirm payment → generates PINs |

### Scheduling & Rescheduling (PRD 7)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PATCH | `/delivery/:id/reschedule` | ✅ | Reschedule a delivery |
| POST | `/delivery/:id/reschedule-preview` | ✅ | Preview price difference for reschedule |
| POST | `/delivery/:id/confirm-reschedule-payment` | ✅ | Confirm reschedule with additional payment |
| GET | `/delivery/:id/can-reschedule` | ✅ | Check if reschedulable (PRD 7.4 rules) |

### Rider Info (PRD 6.2)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/delivery/:id/rider` | ✅ | Rider name, photo, vehicle, ETA (NO contact) |

### Coupons (PRD 8.2)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/delivery/coupon/validate/:code` | ✅ | **NEW** Validate coupon before use |

### Create Delivery Body
```json
{
  "deliveryType": "quick",
  "pickupLocation": {
    "address": "123 Main Street, Lagos",
    "latitude": "6.5244",
    "longitude": "3.3792",
    "contactName": "John Doe",
    "contactPhone": "+2348012345678"
  },
  "dropoffLocation": {
    "address": "456 Market Road, Lagos",
    "latitude": "6.4541",
    "longitude": "3.4035",
    "contactName": "Jane Doe",
    "contactPhone": "+2348098765432"
  },
  "parcelDetails": {
    "description": "Documents",
    "size": "small",
    "weight": 2.5,
    "isFragile": false
  },
  "scheduledPickupTime": "2025-01-15T10:00:00Z",  // required for scheduled
  "couponCode": "SAVE20",                           // optional
  "paymentReference": "PAY_ref_123"                  // required for scheduled (PRD 7.2)
}
```

---

## 4. PAYMENT — `/payment`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payment/initiate` | ✅ | Initiate payment for delivery |
| POST | `/payment/verify` | ✅ | Verify payment status |
| GET | `/payment/wallet` | ✅ | Get wallet balance |
| POST | `/payment/wallet/fund` | ✅ | Fund wallet via card/bank |
| POST | `/payment/wallet/withdraw` | ✅ | Withdraw to bank account |
| GET | `/payment/wallet/transactions` | ✅ | Wallet transaction history |
| GET | `/payment/:id` | ✅ | Get payment by ID |
| GET | `/payment` | ✅ | Payment history |

### Webhook

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/webhooks/paystack` | ❌ (signature verified) | **NEW** Paystack webhook callback |

---

## 5. RATING — `/rating` (PRD 12)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/rating` | ✅ | Submit rating for delivery |
| PUT | `/rating/:id` | ✅ | Update rating (within 24h) |
| GET | `/rating/:id` | ✅ | Get rating by ID |
| GET | `/rating/delivery/:deliveryId` | ✅ | Get rating for specific delivery |
| GET | `/rating` | ✅ | List all my ratings |
| GET | `/rating/tags/available` | ✅ | Get available positive/negative tags |

---

## 6. DISPUTE — `/dispute` (PRD 12)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/dispute` | ✅ | Create dispute for paid incomplete delivery |
| GET | `/dispute/:id` | ✅ | Get dispute with messages |
| GET | `/dispute/delivery/:deliveryId` | ✅ | Get dispute by delivery |
| GET | `/dispute` | ✅ | List all my disputes (with stats) |
| POST | `/dispute/:id/message` | ✅ | Add message to dispute thread |
| PUT | `/dispute/:id` | ✅ | Update dispute description/attachments |
| GET | `/dispute/reasons/list` | ✅ | Get all dispute reason options |

---

## Delivery State Machine (PRD 11)

```
Quick Delivery:
  pending → searching_rider → rider_accepted → rider_en_route_pickup
  → rider_arrived_pickup → awaiting_payment → payment_confirmed
  → pickup_in_progress (PIN verified) → picked_up → in_transit
  → rider_arrived_dropoff → delivery_in_progress (PIN verified)
  → delivered → completed

Scheduled Delivery:
  pending → scheduled (after payment) → rider_assigned (by admin)
  → rider_en_route_pickup → rider_arrived_pickup → pickup_in_progress
  → picked_up → in_transit → rider_arrived_dropoff
  → delivery_in_progress → delivered → completed
```

---

## Payment Flow Summary (PRD 9)

**Quick Delivery:**
1. Customer creates request → `searching_rider`
2. Rider accepts → navigates to pickup
3. Rider arrives → customer calls `POST /delivery/:id/initiate-pickup-payment`
4. Customer pays (wallet/card/bank) → calls `POST /delivery/:id/confirm-pickup-payment`
5. System generates pickup PIN → customer shares with rider
6. Rider verifies PIN → pickup complete

**Scheduled Delivery:**
1. Customer gets estimate → `POST /delivery/estimate`
2. Customer pays via `POST /payment/initiate` with `deliveryRequestId`
3. Customer creates request with `paymentReference` → status = `scheduled`
4. Admin assigns rider → rider notified
5. Pickup/delivery follow same PIN flow

---

## What Was Added/Adjusted

1. **`GET /delivery/coupon/validate/:code`** — Standalone coupon validation with user eligibility checks
2. **`GET /delivery/active/current`** — Get active delivery for home screen
3. **`POST /webhooks/paystack`** — Payment provider webhook with signature verification, auto PIN generation
4. **`paymentReference` field on CreateDeliveryRequestDto** — Scheduled deliveries set to `scheduled` status when payment ref provided (PRD 7.2)
5. **`profilePhotoUrl` on User schema** — Stores actual photo URL alongside `isPhotoUpload` boolean
6. **Webhook handlers** — `handleWebhookPaymentSuccess`, `handleWebhookPaymentFailed`, `handleWebhookTransferSuccess`, `handleWebhookTransferFailed`
