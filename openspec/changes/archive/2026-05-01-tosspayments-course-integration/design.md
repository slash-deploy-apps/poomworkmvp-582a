## Context

현재 프로젝트는 React Router v7 Framework Mode + Drizzle ORM + SQLite + better-auth 스택을 사용합니다. 강좌 구매 기능이 있으나 실제 결제 없이 가짜로 `payments` 테이블에 `status: 'escrow'` 레코드를 삽입한 뒤 바로 `enrollments`를 생성합니다.

토스페이먼츠 v2 결제위젯을 연동하여 실제 결제가 이루어지도록 변경해야 합니다. 사용자는 테스트 키를 보유하고 있으며, 결제 성공 즉시 자동 수강, 환불 기능이 필요합니다.

## Goals / Non-Goals

**Goals:**

- 토스페이먼츠 v2 결제위젯을 강좌 구매 플로우에 통합
- 결제 요청 → 위젯 렌더링 → 결제 승인 → 수강 등록의 완전한 플로우 구현
- 서버 측 결제 승인 API (금액 검증, idempotency)
- 환불 기능 (사용자 요청 → 관리자 승인 → 토스페이먼츠 취소 API)
- 결제 내역 조회 (사용자 대시보드, 관리자 페이지)
- 결제 성공/실패 결과 페이지

**Non-Goals:**

- 정기 구독 결제 (recurring billing)
- 가상계좌 입금 확인 웹훅 (간편결제/카드만 지원)
- 다중 상품 장바구니 결제 (단일 강좌 구매만 지원)
- PG사 별도 계약 또는 라이브 키 배포
- 수익 정산 기능

## Decisions

### 1. Payment Widget over Checkout

**결정**: 결제위젯(Payment Widget) 사용
**근거**: 사용자 경험이 더 자연스럽고, 페이지 이탈률이 낮습니다. 다양한 결제 수단(카드, 간편결제)을 한 번에 제공할 수 있습니다.

### 2. Client-Side OrderId Generation

**결정**: 클라이언트에서 `crypto.randomUUID()`로 orderId 생성, 서버에서 중복 검증
**근거**: 토스페이먼츠는 orderId로 idempotency를 보장합니다. 서버에서도 orderId 중복 여부를 확인하여 이중 방어합니다.

### 3. Payment Record Created Before Widget Render

**결정**: 결제위젯을 렌더링하기 전, 서버에 `orderId`를 전달하여 `PENDING` 상태의 payment 레코드를 미리 생성
**근거**: 결제 성공 후 서버에서 amount 검증 시 DB에 저장된 예상 금액과 비교할 수 있습니다. 또한 race condition을 방지합니다.

### 4. Enrollment on Payment Success Only

**결정**: 결제 승인이 완료된 후에만 `enrollments` 레코드 생성
**근거**: 기존 가짜 결제는 즉시 수강 등록이 되었으나, 실제 결제에서는 승인 실패 시 수강 등록이 되어서는 안 됩니다.

### 5. Refund via Admin Dashboard

**결정**: 환불은 관리자 페이지에서만 처리 가능. 수강률 50% 이상인 경우 자동으로 환불 불가.
**근거**: 환불 정책은 비즈니스 규칙이므로 관리자 판단이 필요합니다. 수강률 50% 이상은 이미 상당한 콘텐츠 소비로 간주하여 환불을 차단합니다. 사용자는 환불 요청만 할 수 있으며, 수강률 체크는 서버에서 `enrollments.progress` 필드를 읽어 자동으로 수행됩니다.

### 6. SQLite Schema Migration

**결정**: Drizzle ORM의 `alter table`을 통해 기존 `payments` 테이블에 필드 추가
**근거**: 기존 데이터는 `referenceId`와 `status` 필드만 존재하므로, 새 필드는 nullable로 추가하고 기본값을 설정합니다. 기존 가짜 결제 데이터는 `status = 'escrow'`로 유지합니다.

## Risks / Trade-offs

- **[Risk]** 토스페이먼츠 SDK가 클라이언트 사이드에서만 로드되므로 SSR 시 hydration mismatch 가능 → Mitigation: `useEffect` 내에서 동적 로드, React Router의 `ClientLoader` 사용
- **[Risk]** 토스페이먼츠 API 호출 실패 시 사용자 경험 저하 → Mitigation: 명확한 에러 메시지, 재시도 버튼 제공
- **[Risk]** 환불 정책 미정의 → Mitigation: MVP에서는 관리자 수동 승인, 추후 자동화
- **[Trade-off]** 결제위젯이 페이지 내에 iframe으로 렌더링되므로 커스텀 스타일링 제한됨 → 토스페이먼츠 기본 UI 수용

## Migration Plan

1. **Phase 1**: Schema migration (payments 테이블 확장)
2. **Phase 2**: 서버 API 구현 (결제 준비, 승인, 환불)
3. **Phase 3**: 클라이언트 결제위젯 연동
4. **Phase 4**: 결제 성공/실패 페이지
5. **Phase 5**: 대시보드/관리자에 결제 내역 표시
6. **Phase 6**: 환불 기능

Rollback: 기존 가짜 결제 로직은 제거되지만, `payments` 테이블의 기존 컬럼은 유지되므로 이전 상태로의 복구가 가능합니다.

## Open Questions

- 환불 가능 기간(예: 7일 이내)은 어디서 관리할 것인가? (현재는 관리자 판단)
- 결제 취소 시 강좌 수강 권한도 즉시 회수할 것인가? (예, 회수)
