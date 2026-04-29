## Context

poomwork는 React Router v7 (framework mode) + Vite + Drizzle ORM + SQLite + Better Auth 기반 프리랜서/교육 마켓플레이스입니다. 현재 모든 이미지 관련 필드(user.image, courses.thumbnailUrl, portfolios.imageUrl)는 DB에 정의만 되어 있고 실제 업로드 UI가 없습니다. 사용자가 이미지를 업로드할 수 있는 기반을 UploadThing으로 구축해야 합니다.

**기존 코드베이스 상태:**

- `app/db/schema.ts`: user.image (TEXT 255), courses.thumbnailUrl (TEXT 500), portfolios.imageUrl (TEXT 500) 필드 존재
- `app/routes/profile-edit.tsx`: 프로필 편집 폼 있으나 이미지 업로드 없음 (action도 image 업데이트 안 함)
- `app/routes/jobs-new.tsx`: 일거리 생성 폼 있으나 이미지 필드 없음
- 강좌 생성/편집 라우트 없음
- 포트폴리오 생성/편집 라우트 없음
- UploadThing 미설치 상태

**기술 스택 제약:**

- UploadThing만 허용 (다른 파일 업로드 서비스 불가)
- React Router v7 framework mode (Next.js 아님)
- `uploadthing/remix` 어댑터 사용

## Goals / Non-Goals

**Goals:**

- UploadThing 파일 라우터 설정 (profileImage, coverImage, courseThumbnail, jobThumbnail, portfolioImage)
- 재사용 가능한 ImageUploader 컴포넌트 (드래그앤드롭 + 클릭, 미리보기, 교체/삭제)
- Better Auth 세션 기반 업로드 인증
- 프로필 편집: 프로필 사진 + 커버 배너 + 포트폴리오(최대 5개) 관리
- 강좌 생성(/courses/new) 및 상세 페이지 편집에 썸네일
- 일거리 생성 및 상세 편집에 썸네일
- DB 마이그레이션: user.coverImage, jobs.thumbnailUrl 추가

**Non-Goals:**

- 비디오 업로드 (이미지만)
- 이미지 리사이징/최적화 (UploadThing이 CDN 제공)
- 파일 업로드 진행률 표시
- 이미지에 AI 기반 기능 (태깅, 얼굴 인식 등)
- 관리자용 이미지 관리 대시보드
- 포트폴리오 다중 이미지 갤러리 (항목당 1장만)

## Decisions

### D1: UploadThing remix 어댑터 사용

**선택**: `uploadthing/remix`에서 `createRouteHandler`, `createUploadthing` 임포트
**이유**: UploadThing이 Remix/React Router v7을 공식 지원함. `createRouteHandler`가 `loader`와 `action`을 반환하여 resource route 패턴에 완벽히 맞음.
**대안**: 커스텀 Express 미들웨어 — 불필요하게 복잡하고 공식 지원 안 됨.

### D2: 단일 API 엔드포인트 + 다중 파일 라우트

**선택**: `/api/uploadthing` 하나의 라우트 파일에 모든 업로드 슬롯 정의
**이유**: UploadThing의 파일 라우터 패턴이 하나의 route handler에서 여러 엔드포인트(profileImage, courseThumbnail 등)를 관리하도록 설계됨.
**구조**:

```
app/routes/api.uploadthing.ts
  → profileImage: { image, 4MB, 1개 }
  → coverImage: { image, 4MB, 1개 }
  → courseThumbnail: { image, 2MB, 1개 }
  → jobThumbnail: { image, 2MB, 1개 }
  → portfolioImage: { image, 4MB, 1개 }
```

### D3: 업로드 후 DB 업데이트는 클라이언트 콜백 → route action

**선택**: UploadThing `onClientUploadComplete`에서 URL을 받고, route action(form submit)으로 DB에 저장
**이유**: UploadThing의 `onUploadComplete`(서버)에서는 DB 업데이트가 불가능하지 않으나, 클라이언트에서 다른 폼 데이터와 함께 일괄 저장하는 것이 React Router v7의 action 패턴에 더 부합함.
**플로우**:

1. 사용자가 이미지 선택/드래그 → UploadThing에 직접 업로드
2. `onClientUploadComplete`에서 URL 수신 → hidden input에 설정
3. 폼 제출 시 route action에서 URL 포함 전체 데이터를 DB에 저장

### D4: 공유 ImageUploader 컴포넌트

**선택**: `app/components/image-uploader.tsx` 하나의 재사용 컴포넌트
**기능**: 드래그앤드롭 + 클릭, 미리보기, 기존 이미지 표시, 교체, 삭제
**Props**: endpoint, currentImageUrl, onUploadComplete, onRemove, className
**이유**: 모든 이미지 업로드 UI를 통일하기로 함. UploadThing의 `useUploadThing` 훅을 사용하여 커스텀 UI 구현.

### D5: DB 스키마 확장

**선택**:

- `user` 테이블: `coverImage` TEXT(500) 필드 추가
- `jobs` 테이블: `thumbnailUrl` TEXT(500) 필드 추가
- `courses.thumbnailUrl`과 `portfolios.imageUrl`은 이미 존재하므로 그대로 사용

**이유**: 커버 이미지와 일거리 썸네일은 현재 DB에 필드가 없음.

### D6: 강좌 관리 라우트

**선택**:

- `/courses/new` — 강좌 생성 페이지 (신규)
- `/courses/:courseId` — 상세 페이지에 강사용 편집 버튼 + 편집 모달 추가
  **이유**: 강좌 생성 페이지가 아예 없어서 신규 생성 필요.

### D7: 포트폴리오 관리를 프로필 편집에 통합

**선택**: 프로필 편집 페이지(`/profile/edit`) 하단에 포트폴리오 섹션 추가
**기능**: 포트폴리오 목록 표시, 추가/편집/삭제, 각 항목에 이미지 + 제목 + 설명
**이유**: 별도 포트폴리오 페이지보다 프로필 편집에서 한 번에 관리하는 것이 UX상 더 좋음.

## Risks / Trade-offs

**[Risk] UploadThing 서비스 장애** → UploadThing은 CDN 기반이라 장애 시 이미지 로딩 불가. 하지만 업로드 실패 시 사용자에게 명확한 에러 메시지 표시. 롤백 불가하므로 서비스 의존성 수용.

**[Risk] DB 마이그레이션 실패** → 기존 테이블에 컬럼 추가는 ADD COLUMN이므로 데이터 손실 위험 낮음. Drizzle 마이그레이션으로 안전하게 처리.

**[Trade-off] 업로드 후 DB 저장이 2단계** → 이미지는 UploadThing에 먼저 업로드되고 폼 제출 시 DB에 저장. 사용자가 폼을 제출하지 않으면 UploadThing에 orphan 파일이 남음. 허용 가능한 수준의 위험.

**[Trade-off] 포트폴리오를 프로필 편집에 통합** → 프로필 편집 페이지가 길어짐. 하지만 사용자 입장에서 한 번에 모든 프로필 정보를 관리할 수 있는 것이 장점.
