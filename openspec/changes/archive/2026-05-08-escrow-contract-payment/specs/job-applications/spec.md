## ADDED Requirements

### Requirement: 지원서 상태 확장

시스템은 `jobApplications`의 `status` 필드가 계약 단계를 포함하도록 확장해야 한다.

#### Scenario: 상태 enum 확장

- **WHEN** 지원서 상태가 업데이트되면
- **THEN** 시스템은 `pending`, `accepted`, `rejected`, `proposal_sent`, `contract_pending`, `contract_signed`, `paid`, `in_progress`, `delivered`, `completed`, `revision_requested` 값을 허용해야 한다

### Requirement: 지원서와 계약 연결

시스템은 지원서가 관련 계약 정보를 참조할 수 있게 해야 한다.

#### Scenario: 계약 참조

- **WHEN** 지원서를 조회하면
- **THEN** 시스템은 해당 지원서와 연결된 최신 계약(`contracts`) 정보를 포함하여 반환할 수 있어야 한다
