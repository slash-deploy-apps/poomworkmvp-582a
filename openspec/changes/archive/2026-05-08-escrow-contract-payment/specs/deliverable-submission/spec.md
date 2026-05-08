## ADDED Requirements

### Requirement: 결과물 전달

시스템은 전문가가 완성된 결과물을 의뢰자에게 전달할 수 있게 해야 한다.

#### Scenario: 결과물 업로드

- **WHEN** 전문가가 "결과물 전달" 페이지에서 파일을 업로드하고 설명을 입력하면
- **THEN** 시스템은 UploadThing을 통해 파일을 저장하고, `contracts.deliverableFiles`(JSON)와 `contracts.deliverableText`를 업데이트한다

#### Scenario: 결과물 전달 완료

- **WHEN** 전문가가 결과물 전달을 확정하면
- **THEN** 시스템은 `contracts.status`를 `delivered`로 변경하고, `deliveredAt`을 현재 시간으로 설정하며, 의뢰자에게 컨펌 요청 알림을 별도 `type='system'` 메시지로 전송한다

### Requirement: 결과물 컨펌

시스템은 의뢰자가 결과물을 검토하고 컨펌할 수 있게 해야 한다.

#### Scenario: 컨펌 수락

- **WHEN** 의뢰자가 결과물을 확인하고 "컨펌" 버튼을 클릭하면
- **THEN** 시스템은 `contracts.status`를 `completed`로 변경하고, 에스크로 해제 API를 호출한다

### Requirement: 결과물 거부 및 재작업 요청

시스템은 의뢰자가 결과물에 대해 거부하고 재작업을 요청할 수 있게 해야 한다.

#### Scenario: 거부 및 재작업 요청

- **WHEN** 의뢰자가 "거부 및 재작업 요청" 버튼을 클릭하고 사유를 입력하면
- **THEN** 시스템은 `contracts.status`를 `revision_requested`로 변경하고, `contracts.revisionNote`를 저장하며, 전문가에게 재작업 요청 메시지를 전송한다

#### Scenario: 재작업 후 재전달

- **WHEN** 전문가가 재작업 결과물을 다시 업로드하면
- **THEN** 시스템은 `contracts.status`를 다시 `delivered`로 변경하고 `deliveredAt`을 업데이트하며, 7일 타이머를 리셋한다
