## Why

현재 관리자 페이지(/admin)는 사용자 목록 조회와 일부 상태 변경만 가능하며, 일거리/강좌/사용자 데이터를 관리자가 직접 수정하거나 삭제할 수 없습니다. 또한 등록자 본인이 자신의 일거리나 강좌를 대시보드에서 수정할 수도 없어 콘텐츠 관리에 불편이 큽니다. 본 변경을 통해 관리자는 모든 데이터를 효율적으로 관리하고, 사용자는 자신의 콘텐츠를 직접 수정할 수 있게 됩니다.

## What Changes

- **Admin 계정 시드**: `admin@poomwork.com` / `1234` 계정을 better-auth 기반으로 생성하고 데이터베이스에 시드
- **관리자 대시보드 확장** (`/admin`):
  - 사용자 계정 관리: 이메일, 이름, 역할(role) 수정
  - 사용자 삭제/복구: soft delete (`status='deleted'`) 및 복구 기능
  - 일거리 삭제/복구: soft delete 및 복구 기능
  - 강좌 삭제/복구: soft delete 및 복구 기능 (가격 수정은 기존에 있음)
  - 비밀번호 재설정: better-auth 기본 `/forgot-password` 링크 제공
- **개인 대시보드 확장** (`/dashboard`):
  - 등록한 일거리 수정: 제목, 설명, 예산, 상태, 마감일, 요구사항 등 모든 필드
  - 등록한 강좌 수정: 제목, 설명, 가격, 상태, 카테고리 등 모든 필드
  - 등록한 일거리/강좌 삭제: soft delete
- **Soft delete 지원**: `jobs`, `courses`, `user` 테이블의 `status` 컬럼을 `'deleted'`로 변경하여 soft delete 구현. 삭제된 항목은 목록에 `'삭제됨'` 라벨로 표시하고 복구 버튼 제공.
- **프로필 수정**: `/profile/edit`에서 본인만 bio, skills, phone, location, coverImage, rating 등 수정 가능 (기존 유지)

## Capabilities

### New Capabilities

- `admin-crud`: 관리자 대시보드에서 사용자, 일거리, 강좌의 삭제/복구 및 사용자 계정 수정 기능
- `user-self-management`: 개인 대시보드에서 자신이 등록한 일거리와 강좌를 수정하고 삭제하는 기능

### Modified Capabilities

- 없음

## Impact

- **app/routes/admin.tsx**: 관리자 대시보드 확장 (삭제/복구 UI, 계정 수정 UI)
- **app/routes/dashboard.tsx**: 개인 대시보드 확장 (일거리/강좌 수정/삭제 UI)
- **app/routes/jobs-edit.tsx** 또는 새 파일: 일거리 수정 폼
- **app/routes/courses-edit.tsx** 또는 새 파일: 강좌 수정 폼
- **scripts/seed.ts**: admin 계정 생성 로직 추가 (better-auth API 사용)
- **app/db/schema.ts**: soft delete 지원 (기존 status 컬럼 활용, 별도 변경 없음)
- **package.json**: 별도 의존성 추가 없음
