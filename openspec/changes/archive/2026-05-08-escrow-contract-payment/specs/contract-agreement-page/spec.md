## ADDED Requirements

### Requirement: 계약 동의 페이지

시스템은 계약에 참여하는 전문가와 의뢰자가 각자 동의할 수 있는 별도 페이지를 제공해야 한다.

#### Scenario: 동의 페이지 접근

- **WHEN** 의뢰자가 제안을 수락하거나, 전문가가 동의 링크에 접근하면
- **THEN** 시스템은 `/contracts/:contractId/agree` 페이지를 렌더링하고, 계약 상세(금액, 기간, 일감 정보)를 표시한다

### Requirement: 양측 동의 체크

시스템은 전문가와 의뢰자가 각자 독립적으로 동의 체크박스를 체크하고 확인 버튼을 누를 수 있게 해야 한다.

#### Scenario: 전문가 동의

- **WHEN** 전문가가 동의 체크박스를 체크하고 "확인" 버튼을 누륾면
- **THEN** 시스템은 `contracts.workerAgreed`를 `true`로 업데이트한다

#### Scenario: 의뢰자 동의

- **WHEN** 의뢰자가 동의 체크박스를 체크하고 "확인" 버튼을 누륾면
- **THEN** 시스템은 `contracts.clientAgreed`를 `true`로 업데이트한다

### Requirement: 실시간 동의 상태 공유

시스템은 3초 폴리 태 리를 통해 양측의 동의 상태를 실시간으로 표시해야 한다.

#### Scenario: 상대방 동의 상태 표시

- **WHEN** 사용자가 동의 페이지에 머무르고 있으면
- **THEN** 시스템은 3초마다 서버를 조회하여 상대방의 동의 상태를 화면에 실시간으로 반영한다

#### Scenario: 양측 동의 완료

- **WHEN** `workerAgreed`와 `clientAgreed`가 모두 `true`가 되면
- **THEN** 시스템은 자동으로 `contracts.status`를 `contract_signed`로 변경하고, 의뢰자 화면에 결제 버튼을 표시한다
