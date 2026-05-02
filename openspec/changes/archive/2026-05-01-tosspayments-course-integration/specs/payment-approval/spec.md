## ADDED Requirements

### Requirement: Confirm payment on server

The system SHALL provide a server endpoint that confirms payment with TossPayments API after the user completes payment.

#### Scenario: Successful payment confirmation

- **WHEN** the user is redirected to `{origin}/payment/success` with query parameters `paymentKey`, `orderId`, `amount`
- **THEN** the client calls the server action `/api/payment/confirm` with `{ paymentKey, orderId, amount }`
- **AND** the server verifies the payment record exists with matching `orderId` and `amount`
- **AND** the server calls TossPayments API `POST https://api.tosspayments.com/v1/payments/confirm` with Basic Auth (secret key)
- **AND** upon success, the server updates the payment record:
  - `status`: 'DONE'
  - `paymentKey`: from TossPayments response
  - `tossPaymentMethod`: from TossPayments response
  - `approvedAt`: from TossPayments response
- **AND** the server creates an `enrollments` record for the user and course
- **AND** the server increments the course `enrollmentCount`
- **AND** the server returns `{ success: true, enrollmentId }`
- **AND** the user is redirected to the course learning page

#### Scenario: Payment amount mismatch

- **WHEN** the server receives a confirm request where `amount` does not match the stored payment record
- **THEN** the server returns `{ success: false, error: 'AMOUNT_MISMATCH' }`
- **AND** no TossPayments API call is made

#### Scenario: Duplicate orderId

- **WHEN** the server receives a confirm request for an orderId that already has `status = 'DONE'`
- **THEN** the server returns `{ success: true, enrollmentId }` (idempotency)
- **AND** no duplicate enrollment is created

#### Scenario: TossPayments API failure

- **WHEN** the TossPayments confirm API returns an error (e.g., invalid paymentKey, expired)
- **THEN** the server updates the payment record `status` to 'FAILED'
- **AND** returns `{ success: false, error: 'PAYMENT_CONFIRM_FAILED', message }`
- **AND** no enrollment is created

### Requirement: Handle payment failure

The system SHALL display a clear failure page when payment fails.

#### Scenario: Payment fail page

- **WHEN** the user is redirected to `{origin}/payment/fail` with query parameters `code`, `message`, `orderId`
- **THEN** the system updates the payment record `status` to 'FAILED' and stores the failure reason
- **AND** displays an error page with the failure message and a "다시 시도" button
- **AND** the user can navigate back to the course detail page

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
