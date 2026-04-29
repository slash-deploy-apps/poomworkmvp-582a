## Why

현재 poomwork에는 이미지 업로드 기능이 전혀 없습니다. 프로필 사진, 강좌 썸네일, 일거리 썸네일, 포트폴리오 이미지 등 시각적 요소가 placeholder 상태이며, 사용자 경험과 서비스 완성도를 크게 떨어뜨리고 있습니다. UploadThing을 통한 이미지 업로드 기능을 추가하여 모든 주요 엔티티에 시각적 콘텐츠를 연결해야 합니다.

## What Changes

- UploadThing SDK 통합: `uploadthing` + `@uploadthing/react` 패키지 설치 및 서버/클라이언트 설정
- 통합 이미지 업로드 컴포넌트: 드래그앤드롭 + 클릭, 미리보기, 교체/삭제 기능을 갖춘 재사용 컴포넌트
- 프로필 이미지: 프로필 사진(드래그앤드롭+클릭) + 커버 배너 이미지(전체 너비) 추가, 프로필 편집 페이지에 통합
- 프로필 편집 페이지에 포트폴리오 섹션 추가: 최대 5개 항목, 각 항목에 이미지 1장, 생성/편집/삭제
- 강좌 썸네일: 새 강좌 생성 페이지(/courses/new) + 강좌 상세 편집 기능에 썸네일 업로드 추가
- 일거리 썸네일: 일거리 생성 폼(jobs-new)에 썸네일 업로드 추가 + 일거리 상세에서 편집 가능
- DB 스키마 변경: user 테이블에 coverImage 필드 추가, jobs 테이블에 thumbnailUrl 필드 추가
- UPLOADTHING_TOKEN 환경변수 설정

## Capabilities

### New Capabilities

- `image-upload`: UploadThing 기반 이미지 업로드 인프라 — 파일 라우터, 인증 미들웨어, 클라이언트 유틸리티, 통합 업로드 UI 컴포넌트 (드래그앤드롭+클릭, 미리보기, 교체/삭제)
- `course-management`: 강좌 생성(/courses/new) 및 편집 기능 — 썸네일 업로드 포함, 강사 권한 검증
- `portfolio-management`: 포트폴리오 CRUD — 프로필 편집 페이지 내 포트폴리오 섹션, 이미지 업로드, 최대 5개 항목

### Modified Capabilities

(기존 specs/ 디렉토리가 비어있어 수정할 기존 capability 없음)

## Impact

- **Dependencies**: `uploadthing`, `@uploadthing/react` 신규 설치
- **Environment**: UPLOADTHING_TOKEN 추가 (.env.local, .env.production, .env.example)
- **Database**: user 테이블에 coverImage TEXT 컬럼 추가, jobs 테이블에 thumbnailUrl TEXT 컬럼 추가 (마이그레이션 필요)
- **Routes**: /courses/new (신규), /courses/:courseId/edit (신규), 기존 profile-edit, jobs-new, jobs-detail, courses-detail 수정
- **Components**: ImageUploader 공유 컴포넌트 신규 생성
- **Files Modified**: app/routes.ts, app/db/schema.ts, vite.config.ts (필요시), .env.\*
