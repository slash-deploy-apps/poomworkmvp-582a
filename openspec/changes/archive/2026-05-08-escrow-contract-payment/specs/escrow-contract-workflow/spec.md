## ADDED Requirements

### Requirement: 계약 엔터티 생성 및 관리

시스템은 지원서를 기반으로 계약(`contracts`) 레코드를 생성하고 관리해야 한다.

#### Scenario: 계약 생성

- **WHEN** 의뢰자가 채팅방의 금액 제안을 수락하면
- **THEN** 시스템은 해당 지원서를 참조하는 `contracts` 레코드를 생성한다

#### Scenario: 계약 상태 전이

- **WHEN** 계약의 상태가 사용자 행동에 따라 변경되면
- **THEN** 시스템은 `proposal_sent` → `contract_pending` → `contract_signed` → `paid` → `in_progress` → `delivered` → `completed` 또는 `revision_requested` 순서로만 전이해야 한다

### Requirement: 계약 정보 조회

시스템은 계약 참여자(전문가, 의뢰자)가 계약 상세 정보를 조회할 수 있게 해야 한다.

#### Scenario: 계약 상세 조회

- **WHEN** 참여자가 `/contracts/:contractId`에 접근하면
- **THEN** 시스템은 계약 상태, 금액, 기간, 양측 동의 상태, 지원서 정보, 연결된 일감 정보를 반환한다

### Requirement: 계약 상태에 따른 접근 제어

시스템은 계약에 관련되지 않은 사용자가 계약 정보에 접근하는 것을 차단해야 한다.

#### Scenario: 비관련자 접근 차단

- **WHEN** 계약과 관련 없는 사용자가 계약 페이지에 접근하면
- **THEN** 시스템은 403 Forbidden을 반환하고 대시보드로 리다이렉트한다
