## ADDED Requirements

### Requirement: 메시지 타입 필드 추가

시스템은 `messages` 테이블에 메시지 유형을 구분하는 필드를 추가해야 한다.

#### Scenario: 타입별 메시지 저장

- **WHEN** 메시지가 생성되면
- **THEN** 시스템은 `type` 필드(`'text'`, `'proposal'`, `'system'`)를 저장하고, `proposal` 및 `system` 타입일 경우 `metadata` JSON 필드에 추가 정보를 저장한다

### Requirement: 제안 메시지 렌더링

시스템은 `type='proposal'`인 메시지를 특별한 카드 UI로 렌더링해야 한다.

#### Scenario: 제안 카드 표시

- **WHEN** 채팅 내역에 `type='proposal'` 메시지가 포함되면
- **THEN** 시스템은 금액, 기간, 상태 배지, 수락/거부 버튼(의뢰자만 표시)을 포함한 카드 UI를 렌더링한다

### Requirement: 시스템 메시지 렌더링

시스템은 `type='system'`인 메시지를 별도의 알림 스타일로 렌더링해야 한다.

#### Scenario: 시스템 알림 표시

- **WHEN** 채팅 내역에 `type='system'` 메시지가 포함되면
- **THEN** 시스템은 가욍가욍 중앙 정렬된 알림 스타일(회색 배경, 작은 글씨)로 렌더링한다
