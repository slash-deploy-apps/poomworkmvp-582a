## Purpose

TBD

## ADDED Requirements

### Requirement: User views payment history

The system SHALL display the user's payment history on their dashboard.

#### Scenario: Dashboard payment list

- **WHEN** a logged-in user navigates to `/dashboard`
- **THEN** the system displays a list of their payments with:
  - Course title
  - Amount
  - Status (PENDING, DONE, FAILED, CANCELLED)
  - Payment method
  - Payment date
  - Refund request button (for DONE payments)

### Requirement: Admin views all payments

The system SHALL display all payments in the admin dashboard.

#### Scenario: Admin payment list

- **WHEN** an admin navigates to `/admin`
- **THEN** the system displays a table of all payments with:
  - Payer name/email
  - Course title
  - Amount
  - Status
  - Payment method
  - Date
  - Refund action buttons (for DONE payments)
  - Refund request queue

### Requirement: Payment status filtering

The system SHALL allow filtering payments by status.

#### Scenario: Filter by status

- **WHEN** an admin selects a status filter (e.g., "DONE", "PENDING")
- **THEN** the payment table updates to show only payments with that status

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
