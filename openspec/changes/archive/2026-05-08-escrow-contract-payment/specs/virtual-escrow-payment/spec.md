## ADDED Requirements

### Requirement: 에스크로 결제 생성

시스템은 양측 동의 완료 후 의뢰자의 NicePay 결제를 에스크로 상태로 기록해야 한다.

#### Scenario: 결제 성공 후 에스크로 상태 저장

- **WHEN** 의뢰자가 NicePay 결제를 성공적으로 완료하면
- **THEN** 시스템은 `payments` 레코드를 생성하고 `status`를 `escrow`로, `type`을 `job_payment`로 설정한다

### Requirement: 결제 완료 시 일 시작 안내

시스템은 에스크로 결제 완료 시 전문가에게 일 시작 안내를 표시해야 한다.

#### Scenario: 일 시작 안내

- **WHEN** 결제가 `escrow` 상태로 저장되면
- **THEN** 시스템은 `contracts.status`를 `in_progress`로 변경하고, 전문가의 대시보드와 채팅방에 "일을 시작하세요" 안내 배너를 표시한다

### Requirement: 에스크로 해제

시스템은 의뢰자 컨펌 시 에스크로를 해제하여 전문가에게 지급 완료 상태로 변경해야 한다.

#### Scenario: 컨펌 기반 에스크로 해제

- **WHEN** 의뢰자가 결과물을 컨펌하면
- **THEN** 시스템은 연결된 `payments` 레코드의 `status`를 `escrow_released`로 변경하고 `escrowReleasedAt`을 현재 시간으로 설정한다

#### Scenario: 지급 완료 안내

- **WHEN** 에스크로가 해제되면
- **THEN** 시스템은 전문가의 대시보드에 "대금 지급이 완료되었습니다" 안내를 표시한다

### Requirement: 7일 자동 에스크로 해제

시스템은 결과물 전달 후 7일이 지나도 의뢰자가 응답하지 않으면 자동으로 에스크로를 해제해야 한다.

#### Scenario: 7일 미응답 자동 해제

- **WHEN** 현재 시간이 `contracts.deliveredAt` + 7일을 초과하고 `status`가 `delivered`인 계약이 조회되면
- **THEN** 시스템은 자동으로 `status`를 `completed`로 변경하고 연결된 `payments`를 `escrow_released`로 업데이트한다
