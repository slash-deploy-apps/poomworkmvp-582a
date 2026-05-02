## 1. Schema & Environment Setup

- [x] 1.1 Add TossPayments-related columns to `payments` table (orderId, paymentKey, tossPaymentMethod, approvedAt, cancelledAt, cancelReason)
- [x] 1.2 Generate and run Drizzle migration for schema changes
- [x] 1.3 Add `@tosspayments/tosspayments-sdk` to package.json dependencies
- [x] 1.4 Install new dependencies (`pnpm install`)
- [x] 1.5 Create `.env.example` with `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`
- [x] 1.6 Update `.env.local` with user's test keys (test*ck*..., test*sk*...)

## 2. Server API Implementation

- [x] 2.1 Create `app/routes/api.payment.prepare.ts` — prepare payment record endpoint
- [x] 2.2 Create `app/routes/api.payment.confirm.ts` — confirm payment with TossPayments API
- [x] 2.3 Create `app/routes/api.payment.refund.ts` — cancel/refund payment endpoint
- [x] 2.4 Create `app/lib/tosspayments.server.ts` — TossPayments API client helper (Basic Auth, confirm, cancel)

## 3. Payment Success/Failure Pages

- [x] 3.1 Create `app/routes/payment.success.tsx` — handle success redirect, call confirm API, redirect to learning page
- [x] 3.2 Create `app/routes/payment.fail.tsx` — handle fail redirect, update payment status, show retry button

## 4. Client-Side Payment Widget Integration

- [x] 4.1 Create `app/components/payment-widget.tsx` — TossPayments widget component
- [x] 4.2 Update `app/routes/courses-detail.tsx` — replace fake payment dialog with real widget
- [x] 4.3 Handle free course enrollment (skip widget, immediate enrollment)

## 5. Payment History & Admin

- [x] 5.1 Update `app/routes/dashboard.tsx` — add user's payment history section
- [x] 5.2 Update `app/routes/admin.tsx` — add admin payment list with refund actions
- [x] 5.3 Add payment status filtering on admin dashboard

## 6. Integration & Cleanup

- [x] 6.1 Remove fake payment logic from `courses-detail.tsx` action
- [x] 6.2 Ensure enrollment is only created after successful payment confirmation
- [x] 6.3 Test full flow: prepare → widget → success → confirm → enrollment
- [x] 6.4 Test failure flow: widget → fail → error page → retry
- [x] 6.5 Test refund flow: admin approve → TossPayments cancel → enrollment removal
- [x] 6.6 Run build check (`pnpm build`)
- [x] 6.7 Commit changes to git
