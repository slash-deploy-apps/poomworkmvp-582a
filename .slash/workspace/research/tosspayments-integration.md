# TossPayments v2 Payment Widget Integration Research

**Date:** 2026-05-01

## Summary

This research covers the integration of TossPayments v2 Payment Widget into a React + Node.js application. The v2 SDK unifies all payment products (payment widget, payment window, brandpay) into a single SDK, recommended over the deprecated v1 SDK.

---

## 1. NPM Packages Required

### Primary Package (Recommended v2)

```bash
npm install @tosspayments/tosspayments-sdk
```

| Package                            | Version           | Weekly Downloads | Purpose                              |
| ---------------------------------- | ----------------- | ---------------- | ------------------------------------ |
| `@tosspayments/tosspayments-sdk`   | 2.6.0 (Mar 2026)  | 39K              | Unified SDK for all payment products |
| `@tosspayments/payment-widget-sdk` | 0.12.1 (Nov 2025) | 8.3K             | Legacy v1 widget SDK (deprecated)    |

**Recommendation:** Use `@tosspayments/tosspayments-sdk` v2 as it's the current recommended version with unified interfaces.

---

## 2. Client-Side Flow

### Installation & Initialization

```jsx
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
import { useEffect, useState, useRef } from 'react';

const clientKey = 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm'; // From Developer Center
const customerKey = generateRandomString(); // Unique customer identifier
// For non-member payments: customerKey = ANONYMOUS
```

### Complete React Implementation

```jsx
export function CheckoutPage() {
  const [amount, setAmount] = useState({ currency: 'KRW', value: 50000 });
  const [ready, setReady] = useState(false);
  const [widgets, setWidgets] = useState(null);

  // Step 1: Initialize SDK
  useEffect(() => {
    async function fetchPaymentWidgets() {
      const tossPayments = await loadTossPayments(clientKey);
      const widgets = tossPayments.widgets({ customerKey });
      setWidgets(widgets);
    }
    fetchPaymentWidgets();
  }, [clientKey, customerKey]);

  // Step 2: Set amount and render UI
  useEffect(() => {
    async function renderPaymentWidgets() {
      if (widgets == null) return;

      await widgets.setAmount(amount);

      await Promise.all([
        widgets.renderPaymentMethods({
          selector: '#payment-method',
          variantKey: 'DEFAULT',
        }),
        widgets.renderAgreement({
          selector: '#agreement',
          variantKey: 'AGREEMENT',
        }),
      ]);

      setReady(true);
    }
    renderPaymentWidgets();
  }, [widgets]);

  // Step 3: Handle coupon/price changes
  const handleCouponChange = async (checked) => {
    await widgets.setAmount({
      currency: 'KRW',
      value: checked ? amount.value - 5000 : amount.value,
    });
  };

  // Step 4: Request payment
  const handlePayment = async () => {
    try {
      await widgets.requestPayment({
        orderId: generateRandomString(), // Unique order ID (6-64 chars)
        orderName: '토스 티셔츠 외 2건',
        successUrl: window.location.origin + '/success',
        failUrl: window.location.origin + '/fail',
        customerEmail: 'customer123@gmail.com',
        customerName: '김토스',
        customerMobilePhone: '01012341234', // Optional
      });
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  return (
    <div>
      <h1>주문서</h1>
      <span>{`${amount.value.toLocaleString()}원`}</span>
      <div id="payment-method" />
      <div id="agreement" />
      <button onClick={handlePayment} disabled={!ready}>
        결제하기
      </button>
    </div>
  );
}
```

### Key Client-Side Methods

| Method                                                                     | Purpose                   |
| -------------------------------------------------------------------------- | ------------------------- |
| `loadTossPayments(clientKey)`                                              | Initialize SDK            |
| `tossPayments.widgets({ customerKey })`                                    | Create widget instance    |
| `widgets.setAmount({ currency, value })`                                   | Set/update payment amount |
| `widgets.renderPaymentMethods({ selector, variantKey })`                   | Render payment UI         |
| `widgets.renderAgreement({ selector, variantKey })`                        | Render terms agreement    |
| `widgets.requestPayment({ orderId, orderName, successUrl, failUrl, ... })` | Trigger payment           |

### Response Handling

The `requestPayment()` method supports two flows:

1. **Redirect Flow** (recommended): User redirected to `successUrl` or `failUrl` with query parameters
2. **Promise Flow**: Returns result directly (not available on mobile)

---

## 3. Server-Side Flow

### Payment Confirmation Endpoint

```javascript
// POST /v1/payments/confirm
const response = await fetch(
  'https://api.tosspayments.com/v1/payments/confirm',
  {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey: '5zJ4xY...',
      orderId: 'order123',
      amount: 15000,
    }),
  },
);
```

### Complete Express.js Implementation

```javascript
const express = require('express');
const app = express();

app.use(express.json());

// TODO: Replace with your secret key from Developer Center
const widgetSecretKey = 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';

// Encode secret key for Basic Auth
const encryptedSecretKey =
  'Basic ' + Buffer.from(widgetSecretKey + ':').toString('base64');

// Payment confirmation endpoint
app.post('/confirm/widget', async function (req, res) {
  const { paymentKey, orderId, amount } = req.body;

  // CRITICAL: Verify amount matches your database order
  const order = await getOrderFromDB(orderId);
  if (order.totalAmount !== amount) {
    return res.status(400).json({ message: 'Amount mismatch' });
  }

  // Check for idempotency - don't process same order twice
  if (order.paymentStatus === 'PAID') {
    return res.json({ status: 'DONE', message: 'Already processed' });
  }

  try {
    const response = await fetch(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        method: 'POST',
        headers: {
          Authorization: encryptedSecretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          amount,
          paymentKey,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      // Handle payment failure
      await updateOrderStatus(orderId, 'FAILED');
      return res.status(response.status).json(result);
    }

    // Payment successful - update order status
    await updateOrderStatus(orderId, 'PAID', {
      paymentKey: result.paymentKey,
      approvedAt: result.approvedAt,
    });

    res.json(result);
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Success page handler (receives redirect from client)
app.get('/success', async function (req, res) {
  const { paymentKey, orderId, amount } = req.query;

  // Call confirmation endpoint
  // Or verify and render success page
  res.redirect(`/order-complete?orderId=${orderId}`);
});
```

### API Response Structure

```json
{
  "status": "DONE",
  "approvedAt": "2021-01-01T10:05:40+09:00",
  "paymentKey": "5zJ4xY...",
  "orderId": "order123",
  "totalAmount": 15000,
  "method": "CARD",
  "card": {
    "issuerCode": "61",
    "acquirerCode": "31",
    "number": "48902300****406*"
  }
}
```

---

## 4. Required Environment Variables

### Test Keys (Development)

| Variable          | Example                                  | Purpose                           |
| ----------------- | ---------------------------------------- | --------------------------------- |
| `TOSS_CLIENT_KEY` | `test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm` | Client-side widget initialization |
| `TOSS_SECRET_KEY` | `test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6` | Server-side API calls             |

### Production Keys

| Variable          | Prefix         | Purpose           |
| ----------------- | -------------- | ----------------- |
| `TOSS_CLIENT_KEY` | `live_gck_...` | Production widget |
| `TOSS_SECRET_KEY` | `live_gsk_...` | Production API    |

### Key Types

- **Payment Widget**: Uses Widget Client Key (`test_gck_` / `live_gck_`)
- **Payment Window / BrandPay**: Uses API Individual Client Key (`test_ck_` / `live_ck_`)

### .env Example

```env
# Development
TOSS_CLIENT_KEY=test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm
TOSS_SECRET_KEY=test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6

# Production (use your live keys)
# TOSS_CLIENT_KEY=live_gck_...
# TOSS_SECRET_KEY=live_gsk_...
```

---

## 5. Database Schema Considerations

### Payments Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(64) NOT NULL UNIQUE,
  payment_key VARCHAR(200) UNIQUE,
  customer_key VARCHAR(100),
  amount BIGINT NOT NULL,
  currency VARCHAR(3) DEFAULT 'KRW',
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  -- PENDING, READY, IN_PROGRESS, DONE, CANCELED, PARTIAL_CANCELED, EXPIRED, WAITING_FOR_DEPOSIT
  payment_method VARCHAR(20),
  -- CARD, VIRTUAL_ACCOUNT, TRANSFER, PAYPAL, etc.
  card_issuer_code VARCHAR(10),
  card_number VARCHAR(20),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Additional fields
  order_name VARCHAR(200),
  customer_email VARCHAR(100),
  customer_name VARCHAR(50),

  -- For virtual account payments
  virtual_account_number VARCHAR(50),
  virtual_account_bank VARCHAR(20),
  deposit_due_date TIMESTAMP,

  -- Metadata
  metadata JSONB,

  CONSTRAINT valid_amount CHECK (amount >= 0)
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_payment_key ON payments(payment_key);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_customer_key ON payments(customer_key);
```

### Orders Table (Reference)

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(64) NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id),
  total_amount BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  -- PENDING, PAID, SHIPPED, COMPLETED, CANCELLED, REFUNDED
  payment_id UUID REFERENCES payments(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Status Flow

```
PENDING → READY → IN_PROGRESS → DONE (success)
                              → EXPIRED (timeout)
                              → CANCELED (user cancel)
                              → WAITING_FOR_DEPOSIT (virtual account)
                              → PARTIAL_CANCELED (partial refund)
```

---

## 6. Webhook Handling

### Available Webhook Events

| Event                    | Description                          |
| ------------------------ | ------------------------------------ |
| `PAYMENT_STATUS_CHANGED` | Payment status changes (all methods) |
| `DEPOSIT_CALLBACK`       | Virtual account deposit notification |
| `CANCEL_STATUS_CHANGED`  | Foreign payment cancellations        |
| `METHOD_UPDATED`         | BrandPay payment method changes      |
| `payout.changed`         | Payout request status changes        |
| `seller.changed`         | Seller verification status changes   |

### Webhook Endpoint Implementation

```javascript
const crypto = require('crypto');

app.post('/webhook', async function (req, res) {
  const webhookSecret = process.env.TOSS_WEBHOOK_SECRET;

  // Verify webhook signature
  const signature = req.headers['tosspayments-webhook-signature'];
  const transmissionTime =
    req.headers['tosspayments-webhook-transmission-time'];

  if (
    !verifyWebhookSignature(
      req.body,
      signature,
      transmissionTime,
      webhookSecret,
    )
  ) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  const { eventType, data } = req.body;

  switch (eventType) {
    case 'PAYMENT_STATUS_CHANGED':
      await handlePaymentStatusChanged(data);
      break;
    case 'DEPOSIT_CALLBACK':
      await handleDepositCallback(data);
      break;
    case 'CANCEL_STATUS_CHANGED':
      await handleCancelStatusChanged(data);
      break;
    default:
      console.log('Unknown event type:', eventType);
  }

  // Must return 200 within 10 seconds
  res.status(200).json({ status: 'ok' });
});

function verifyWebhookSignature(payload, signature, transmissionTime, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(`${payload}:${transmissionTime}`)
    .digest('base64');

  // Check against v1:signature format
  return signature.includes(hash);
}

async function handlePaymentStatusChanged(data) {
  const { paymentKey, orderId, status } = data;

  switch (status) {
    case 'DONE':
      await updatePaymentStatus(paymentKey, 'PAID');
      await updateOrderStatus(orderId, 'PAID');
      break;
    case 'CANCELED':
      await updatePaymentStatus(paymentKey, 'CANCELED');
      await updateOrderStatus(orderId, 'CANCELLED');
      break;
    case 'EXPIRED':
      await updatePaymentStatus(paymentKey, 'EXPIRED');
      break;
  }
}

async function handleDepositCallback(data) {
  const { paymentKey, orderId, status, depositReceivedAt } = data;

  if (status === 'DONE' && depositReceivedAt) {
    await updatePaymentStatus(paymentKey, 'PAID');
    await updateOrderStatus(orderId, 'PAID');
  }
}
```

### Webhook Retry Policy

- TossPayments retries up to 7 times if no 200 response
- Retry interval increases: immediate, 1min, 5min, 30min, 2hr, 10hr, 24hr
- Must respond within 10 seconds

---

## 7. Security Best Practices

### 7.1 Idempotency

**Critical:** Use `orderId` as idempotency key to prevent duplicate payments.

```javascript
app.post('/confirm/widget', async function (req, res) {
  const { orderId } = req.body;

  // Check if already processed
  const existingPayment = await db.payments.findOne({ orderId });
  if (existingPayment?.status === 'DONE') {
    return res.json({ status: 'DONE', message: 'Already processed' });
  }

  // Use database transaction
  await db.transaction(async (trx) => {
    // Lock the order row
    const order = await trx.orders.findOne({ orderId, status: 'PENDING' });
    if (!order) {
      throw new Error('Order not found or already processed');
    }

    // Proceed with payment confirmation
    // ...
  });
});
```

### 7.2 Amount Verification

**Critical:** Always verify payment amount matches your database, not just client data.

```javascript
app.post('/confirm/widget', async function (req, res) {
  const { paymentKey, orderId, amount } = req.body;

  // Get order from YOUR database
  const order = await db.orders.findOne({ orderId });

  // CRITICAL: Verify amount matches
  if (order.totalAmount !== amount) {
    // Log suspicious activity
    console.error('Amount mismatch!', {
      orderId,
      expected: order.totalAmount,
      received: amount,
    });
    return res.status(400).json({
      code: 'AMOUNT_MISMATCH',
      message: 'Payment amount does not match order',
    });
  }

  // Proceed with confirmation
});
```

### 7.3 Order ID Generation

- Use cryptographically secure random strings
- Length: 6-64 characters
- Allowed: uppercase/lowercase letters, numbers, hyphens, underscores

```javascript
function generateOrderId() {
  return crypto.randomBytes(16).toString('hex').slice(0, 32);
}

// Or using nanoid
import { nanoid } from 'nanoid';
const orderId = nanoid(32);
```

### 7.4 Secret Key Security

```javascript
// NEVER expose secret key on client side
// Only use clientKey in browser

// Server-side: Keep secret key in environment variables
const secretKey = process.env.TOSS_SECRET_KEY; // Never log or expose

// Basic Auth encoding
const auth = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');
```

### 7.5 Additional Security Measures

| Practice                 | Description                             |
| ------------------------ | --------------------------------------- |
| **HTTPS Only**           | Always use HTTPS in production          |
| **Webhook Verification** | Verify webhook signatures               |
| **Rate Limiting**        | Protect payment endpoints               |
| **Logging**              | Log all payment events for audit        |
| **Error Handling**       | Don't expose internal errors to clients |
| **Timeout Handling**     | Set appropriate timeouts for API calls  |

---

## 8. Key References

### Official Documentation

- [Payment Widget Integration Guide](https://docs.tosspayments.com/guides/v2/payment-widget/integration)
- [JavaScript SDK v2](https://docs.tosspayments.com/sdk/v2/js)
- [API Guide](https://docs.tosspayments.com/reference/using-api/api-keys)
- [Webhook Events](https://docs.tosspayments.com/reference/using-api/webhook-events)

### Sample Projects

- [Official Express + React Sample](https://github.com/tosspayments/tosspayments-sample/tree/main/express-react)
- [Payment Widget v1 Sample](https://github.com/tosspayments/tosspayments-sample-v1/tree/main/payment-widget)

### NPM Packages

- [@tosspayments/tosspayments-sdk](https://www.npmjs.com/package/@tosspayments/tosspayments-sdk)
- [@tosspayments/payment-widget-sdk](https://www.npmjs.com/package/@tosspayments/payment-widget-sdk) (v1 - deprecated)

---

## 9. Implementation Checklist

- [ ] Register for TossPayments merchant account
- [ ] Obtain test client key and secret key from Developer Center
- [ ] Install `@tosspayments/tosspayments-sdk` package
- [ ] Create payment widget React component
- [ ] Implement server-side payment confirmation endpoint
- [ ] Set up database schema for payments
- [ ] Configure webhook endpoint (for virtual accounts)
- [ ] Implement idempotency checks
- [ ] Add amount verification
- [ ] Test with test keys in sandbox
- [ ] Switch to production keys when ready
- [ ] Register production webhook endpoints
