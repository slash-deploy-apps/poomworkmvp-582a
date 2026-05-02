## Context

현재 poomwork 플랫폼은 React Router v7 + better-auth + Drizzle ORM + SQLite 기반으로 운영되고 있다. 관리자 페이지(/admin)는 사용자 목록, 일거리 목록, 강좌 목록, 결제 내역을 읽기 전용으로 표시하며 일부 상태 변경 기능만 제공한다. 등록자는 자신의 일거리나 강좌를 수정/삭제할 수 없어 콘텐츠 관리에 불편이 크다.

## Goals / Non-Goals

**Goals:**

- 관리자가 `/admin` 페이지에서 사용자 계정(email, name, role) 수정
- 관리자가 `/admin` 페이지에서 사용자/일거리/강좌를 soft delete(status='deleted') 및 복구
- 관리자가 사용자에게 better-auth 기반 비밀번호 재설정 링크 제공
- 등록자가 `/dashboard`에서 자신의 일거리/강좌를 수정 및 soft delete
- 삭제된 항목은 목록에 '삭제됨' 라벨 + 복구 버튼으로 표시
- admin@poomwork.com / 1234 계정을 seed로 생성

**Non-Goals:**

- hard delete (완전 삭제) 지원
- 관리자가 다른 사용자의 프로필(bio, skills 등) 수정
- 관리자가 다른 사용자의 비밀번호를 직접 변경
- 데이터 마이그레이션 (이미 status 컬럼이 존재)
- 신규 테이블 추가

## Decisions

1. **Soft delete 방식**: 기존 `status` 컬럼을 `'deleted'`로 변경
   - Rationale: 별도 `isDeleted` 컬럼 추가 없이 기존 컬럼 재활용, 쿼리 변경 최소화
   - Alternative considered: `deletedAt` 타임스탬프 컬럼 추가 → 기존 로직에 미치는 영향이 큼

2. **Admin 계정 생성**: `scripts/seed.ts`에서 better-auth의 `auth.api.signUpEmail` API 호출
   - Rationale: better-auth의 비밀번호 해싱, 세션 관리를 그대로 활용
   - Alternative considered: DB에 직접 INSERT → 비밀번호 해싱 로직 재구현 필요

3. **일거리/강좌 수정 위치**: `/dashboard` (개인 대시보드)에서만, `/admin`에서는 삭제/복구만
   - Rationale: 사용자 인터뷰 결과, 등록자가 본인 대시보드에서 수정하는 것이 UX상 자연스러움
   - Admin 페이지에서는 삭제/복구만 집중하여 권한 분리 명확화

4. **비밀번호 재설정**: better-auth 기본 `/forgot-password` 페이지 링크 제공
   - Rationale: 보안상 관리자가 직접 비밀번호를 설정하는 것보다 안전
   - Alternative considered: 관리자가 임시 비밀번호 입력 → 보안 리스크

## Risks / Trade-offs

- **[Risk]** 일거리/강좌를 삭제하면 연관된 지원서, 수강신청, 결제 데이터가 orphaned 상태가 될 수 있음
  - **Mitigation**: 삭제 전 'N개의 연관 데이터가 있습니다. 정말 삭제하시겠습니까?' 확인 대화상자 표시. 복구 기능으로 실수 대응.
- **[Risk]** status='deleted' 항목이 기존 공개 목록(/jobs, /courses)에 노출될 수 있음
  - **Mitigation**: 모든 공개 목록 쿼리에 `.where(ne(table.status, 'deleted'))` 조건 추가
- **[Risk]** 관리자가 실수로 관리자 계정을 삭제하면 플랫폼 관리 불가
  - **Mitigation**: role='admin'인 사용자는 삭제 버튼 비활성화 + '관리자 계정은 삭제할 수 없습니다' 메시지

## Migration Plan

1. `scripts/seed.ts` 업데이트 후 `pnpm tsx scripts/seed.ts` 실행하여 admin 계정 생성
2. `app/routes/admin.tsx` 확장 (삭제/복구/계정 수정 UI)
3. `app/routes/dashboard.tsx` 확장 (일거리/강좌 수정/삭제 UI)
4. `/jobs`, `/courses` 등 공개 목록 쿼리에 soft delete 필터 추가
5. 빌드 및 배포

롤백: 이전 커밋으로 되돌리면 됨 (데이터 손상 없음, soft delete는 데이터 보존)

## Open Questions

- 없음
