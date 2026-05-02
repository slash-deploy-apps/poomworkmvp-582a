## ADDED Requirements

### Requirement: Request refund
The system SHALL allow users to request a refund for a completed payment.

#### Scenario: User requests refund
- **WHEN** a logged-in user navigates to their payment history and clicks "환불 요청" on a completed payment
- **THEN** the system checks the user's `enrollments.progress` for the associated course
- **AND** if `progress >= 0.5`, the system displays an error: "수강률이 50%를 초과하여 환불이 불가능합니다"
- **AND** if `progress < 0.5`, the system creates a refund request record with `status: 'REQUESTED'` and a reason
- **AND** displays a confirmation message

### Requirement: Admin approves refund
The system SHALL allow administrators to approve or reject refund requests and process the actual refund via TossPayments API.

#### Scenario: Admin approves refund (low progress)
- **WHEN** an admin clicks "환불 승인" on a refund request where the user's `enrollments.progress < 0.5`
- **THEN** the system calls TossPayments API `POST https://api.tosspayments.com/v1/payments/{paymentKey}/cancel` with:
  - `cancelReason`: the refund reason
- **AND** upon success, updates the payment record:
  - `status`: 'CANCELLED'
  - `cancelledAt`: current timestamp
  - `cancelReason`: the reason
- **AND** deletes the associated `enrollments` record (or sets it inactive)
- **AND** decrements the course `enrollmentCount`
- **AND** displays a success message

#### Scenario: Refund blocked due to high progress
- **WHEN** an admin clicks "환불 승인" on a refund request where the user's `enrollments.progress >= 0.5`
- **THEN** the system immediately rejects the refund with error: `REFUND_BLOCKED_HIGH_PROGRESS`
- **AND** displays a message: "수강률이 50%를 초과하여 환불이 불가능합니다"
- **AND** the payment record remains `status: 'DONE'`
- **AND** the enrollment is preserved

#### Scenario: Admin rejects refund
- **WHEN** an admin clicks "환불 거절" on a refund request
- **THEN** the system updates the refund request status to 'REJECTED'
- **AND** the payment record remains `status: 'DONE'`
- **AND** the enrollment is preserved

#### Scenario: Refund API failure
- **WHEN** the TossPayments cancel API returns an error
- **THEN** the system displays the error message to the admin
- **AND** the payment record remains unchanged
- **AND** the admin can retry

## MODIFIED Requirements

None.

## REMOVED Requirements

None.