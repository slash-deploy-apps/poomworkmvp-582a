## Why

현재 플랫폼은 전문가와 의뢰자 간의 일감 거래가 지원서 제출과 직접 결제까지만 가능합니다. 그러나 의뢰자가 선결제한 후 전문가가 일을 마치지 않는 리스크, 혹은 전문가가 일을 완료한 후 의뢰자가 대금을 지급하지 않는 리스크가 존재합니다. 에스크로(escrow) 시스템을 도입하여 의뢰자가 선결제하면 플랫폼이 대금을 보관하고, 전문가가 결과물을 전달·의뢰자가 컨펌하면 전문가에게 대금을 지급하는 안전한 거래 플로우가 필요합니다.

## What Changes

- 채팅방 UI에 "금액 제안" 기능 추가: 전문가가 의뢰자에게 금액/기간을 제안하고, 제안 카드가 채팅 내역에 표시됨
- 제안 수락 시 계약 동의 페이지로 이동: 양측이 3초 폴리 태 리로 실시간 동의 상태를 확인하며 체크박스에 동의
- 양측 동의 완료 시 의뢰자 화면에 NicePay 결제창 실행 → 결제 성공 시 에스크로 상태로 대금 보관
- 결제 완료 시 전문가에게 "일 시작" 안내 노티피케이션 표시
- 전문가가 결과물(파일+텍스트/링크)을 업로드하여 의뢰자에게 전달
- 의뢰자가 결과물을 컨펌(수락)하거나 거부(재작업 요청)할 수 있음
- 컨펌 시 에스크로 해제 → 전문가에게 대금 지급 완료 안내
- 7일 미응답 시 자동 에스크로 해제
- 지원서(`jobApplications`) 상태 플로우 확장: `pending` → `proposal_sent` → `contract_pending` → `contract_signed` → `paid` → `in_progress` → `delivered` → `completed` / `revision_requested`

## Capabilities

### New Capabilities

- `escrow-contract-workflow`: 에스크로 계약 전체 플로우 관리 (제안→동의→결제→진행→전달→컨펌→해제)
- `proposal-chat-integration`: 채팅방 내 금액 제안 메시지 카드 및 제안 수락/거부 인터랙션
- `contract-agreement-page`: 양측 실시간 동의 체크 페이지 (3초 폴리 태 리)
- `deliverable-submission`: 결과물 파일+텍스트 업로드 및 컨펌/거부 플로우
- `virtual-escrow-payment`: 에스크로 결제 상태 관리 및 7일 자동 해제

### Modified Capabilities

- `messages`: 메시지 테이블에 `proposalId`, `proposalStatus` 필드 추가, 제안 관련 메시지 렌더링
- `job-applications`: 지원서 상태 enum 확장, 계약 관련 필드(`contractId`, `agreedAt`) 추가
- `payments`: `status`에 `escrow`, `escrow_released` 추가, `escrowReleasedAt` 필드 활성화

## Impact

- **DB**: `messages`, `jobApplications`, `payments` 테이블 스키마 변경 및 마이그레이션 필요
- **API**: 새로운 계약/에스크로 관련 API 엔드포인트 추가
- **Routes**: `/contracts/:contractId/agree`, `/contracts/:contractId/pay`, `/contracts/:contractId/deliver`, `/contracts/:contractId/confirm` 등 신규 라우트
- **UI**: 메시지 페이지에 제안 카드, 계약 동의 페이지, 결과물 전달/컨펌 페이지 추가
- **External**: 기존 NicePay 결제 API 그대로 활용 (에스크로 플래그만 추가)
