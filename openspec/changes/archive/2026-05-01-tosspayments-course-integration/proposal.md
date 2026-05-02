## Why

현재 강좌 구매 기능은 가짜 결제로 구현되어 있습니다. 사용자가 '결제하기' 버튼을 누른 시점에 DB의 `payments` 테이블에 `status: 'escrow'` 레코드를 insert하고 바로 수강 등록이 완료됩니다. 실제 결제 프로세스 없이 물건을 공짜로 얻는 셈이므로, 실제 결제 시스템 연동이 필수적입니다. 토스페이먼츠(v2) 결제위젯을 연동하여 실제 결제가 가능하도록 개선합니다.

## What Changes

- **BREAKING**: 기존 가짜 결제 플로우를 완전히 제거하고 토스페이먼츠 결제위젯으로 대체합니다.
- 강좌 상세 페이지의 결제 다이얼로그를 토스페이먼츠 결제위젯으로 교체합니다.
- 결제 승인을 위한 서버 API 엔드포인트를 추가합니다.
- `payments` 테이블 스키마를 토스페이먼츠 연동에 맞게 확장합니다 (orderId, paymentKey, tossPaymentMethod 등 필드 추가).
- 결제 성공/실패 처리 페이지를 추가합니다.
- 결제 내역 조회 기능을 대시보드에 추가합니다.
- 관리자 대시보드에 결제 현황 및 환불 기능을 추가합니다.
- 환경 변수에 토스페이먼츠 키를 추가합니다 (TOSS_CLIENT_KEY, TOSS_SECRET_KEY).

## Capabilities

### New Capabilities

- `tosspayments-integration`: 토스페이먼츠 v2 결제위젯 연동 (클이언트 SDK 렌더링, 결제 요청, 성공/실패 처리)
- `payment-approval`: 서버 측 결제 승인 API 및 금액 검증, idempotency 처리
- `payment-refund`: 관리자/사용자 환불 기능 (토스페이먼츠 취소 API 연동)
- `payment-history`: 사용자 및 관리자 결제 내역 조회

### Modified Capabilities

- `course-management`: 강좌 구매 플로우가 실제 결제 기반으로 변경됨. 수강 등록(enrollment)이 결제 승인 후에만 생성되도록 수정.

## Impact

- **Frontend**: `app/routes/courses-detail.tsx` (결제 다이얼로그 교체), 새 라우트 `app/routes/payment-success.tsx`, `app/routes/payment-fail.tsx`
- **Backend**: 새 서버 액션/라우트 `app/routes/api.payment.confirm.ts`, `app/routes/api.payment.refund.ts`
- **Database**: `payments` 테이블 스키마 확장 (마이그레이션 필요)
- **Dependencies**: `@tosspayments/tosspayments-sdk` 추가
- **Environment**: `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY` 환경 변수 추가
- **Security**: 시크릿 키는 서버 사이드에서만 사용, 클라이언트에는 노출 불가
