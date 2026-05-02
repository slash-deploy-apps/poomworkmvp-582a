## MODIFIED Requirements

### Requirement: Course purchase creates enrollment after payment

The course purchase action SHALL only create an enrollment after successful payment confirmation.

#### Scenario: Paid course purchase flow

- **WHEN** a user initiates purchase of a paid course
- **THEN** the system creates a PENDING payment record
- **AND** renders the TossPayments widget
- **AND** upon successful payment confirmation, creates the enrollment
- **AND** redirects to the learning page
- **AND** if payment fails, no enrollment is created

#### Scenario: Free course enrollment

- **WHEN** a user enrolls in a free course
- **THEN** no payment record is created (or a zero-amount record is created)
- **AND** the enrollment is created immediately
- **AND** the user is redirected to the learning page

## ADDED Requirements

None.

## REMOVED Requirements

### Requirement: Fake payment escrow

**Reason**: Replaced by real TossPayments integration
**Migration**: Existing `status: 'escrow'` records in `payments` table are preserved for historical data. New payments use TossPayments flow.

## RENAMED Requirements

None.
