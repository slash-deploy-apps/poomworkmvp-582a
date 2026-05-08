## ADDED Requirements

### Requirement: 에스크로 결제 상태

시스템은 `payments` 테이블의 `status` 필드가 에스크로 관련 상태를 포함하도록 확장해야 한다.

#### Scenario: 상태 enum 확장

- **WHEN** 결제 상태가 업데이트되면
- **THEN** 시스템은 `pending`, `completed`, `escrow`, `escrow_released`, `DONE`, `PENDING`, `FAILED`, `CANCELLED` 값을 허용해야 한다

### Requirement: 에스크로 해제 시간 기록

시스템은 에스크로 해제 시점을 `escrowReleasedAt` 필드에 기록해야 한다.

#### Scenario: 해제 시간 기록

- **WHEN** 결제 상태가 `escrow_released`로 변경되면
- **THEN** 시스템은 `escrowReleasedAt` 필드를 현재 시간으로 업데이트해야 한다

### Requirement: 결제와 계약 연결

시스템은 결제 레코드가 관련 계약을 참조할 수 있게 해야 한다.

#### Scenario: 계약 참조

- **WHEN** 에스크로 결제가 생성되면
- **THEN** 시스템은 `referenceId` 필드에 계약 ID(`contractId`)를 저장해야 한다
