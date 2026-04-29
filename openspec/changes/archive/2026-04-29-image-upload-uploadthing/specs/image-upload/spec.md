## ADDED Requirements

### Requirement: UploadThing 파일 라우터 설정

시스템은 `/api/uploadthing` 엔드포인트에 UploadThing 파일 라우터를 제공해야 한다. 파일 라우터는 다음 업로드 슬롯을 정의해야 한다:

- `profileImage`: 이미지, 최대 4MB, 1개
- `coverImage`: 이미지, 최대 4MB, 1개
- `courseThumbnail`: 이미지, 최대 2MB, 1개
- `jobThumbnail`: 이미지, 최대 2MB, 1개
- `portfolioImage`: 이미지, 최대 4MB, 1개

허용 이미지 형식: JPG, PNG, WebP만.

#### Scenario: 인증된 사용자가 이미지를 업로드할 수 있음

- **WHEN** 로그인한 사용자가 이미지를 업로드함
- **THEN** UploadThing에 파일이 업로드되고 공개 URL이 반환됨

#### Scenario: 미인증 사용자의 업로드 차단

- **WHEN** 로그인하지 않은 사용자가 업로드를 시도함
- **THEN** UploadThingError('Unauthorized')가 발생하고 업로드가 거부됨

#### Scenario: 파일 크기 초과 시 업로드 거부

- **WHEN** 프로필 이미지로 5MB 파일을 업로드함
- **THEN** 파일 크기 제한(4MB) 초과로 업로드가 거부됨

#### Scenario: 지원하지 않는 파일 형식 거부

- **WHEN** GIF 파일을 업로드함
- **THEN** 지원하지 않는 형식으로 업로드가 거부됨

### Requirement: 이미지 업로드 클라이언트 유틸리티

`app/lib/uploadthing.ts` 파일에서 타입 안전한 UploadThing 클라이언트 컴포넌트와 훅을 제공해야 한다:

- `UploadButton`: generateUploadButton<UploadRouter>()
- `UploadDropzone`: generateUploadDropzone<UploadRouter>()
- `useUploadThing`: generateReactHelpers<UploadRouter>()

#### Scenario: 타입 안전한 업로드 컴포넌트 사용

- **WHEN** 개발자가 UploadButton에 endpoint="profileImage"를 전달함
- **THEN** TypeScript가 올바른 endpoint인지 타입 검사를 수행함

### Requirement: 통합 ImageUploader 컴포넌트

`app/components/image-uploader.tsx`에 재사용 가능한 이미지 업로더 컴포넌트를 제공해야 한다. 이 컴포넌트는:

- 드래그앤드롭과 클릭으로 파일 선택 가능
- 업로드 전 미리보기 표시
- 기존 이미지가 있으면 표시
- 교체 버튼으로 새 이미지 업로드
- 삭제 버튼으로 이미지 제거 (빈 상태로 복원)
- 업로드 중 로딩 상태 표시
- 에러 발생 시 에러 메시지 표시

Props:

- `endpoint`: UploadThing 엔드포인트명
- `currentImageUrl?`: 기존 이미지 URL
- `onUploadComplete(url: string)`: 업로드 완료 콜백
- `onRemove?`: 이미지 삭제 콜백
- `className?`: 커스텀 스타일

#### Scenario: 드래그앤드롭으로 이미지 업로드

- **WHEN** 사용자가 이미지를 드래그앤드롭 영역에 드롭함
- **THEN** 미리보기가 표시되고 UploadThing에 업로드가 시작됨

#### Scenario: 클릭으로 이미지 선택

- **WHEN** 사용자가 업로드 영역을 클릭함
- **THEN** 파일 선택 다이얼로그가 열리고 이미지 선택 후 미리보기 표시

#### Scenario: 이미지 교체

- **WHEN** 기존 이미지가 표시된 상태에서 교체 버튼을 클릭함
- **THEN** 파일 선택 다이얼로그가 열리고 새 이미지로 교체됨

#### Scenario: 이미지 삭제

- **WHEN** 삭제 버튼을 클릭함
- **THEN** 이미지가 제거되고 빈 업로드 영역으로 복원됨

#### Scenario: 업로드 실패 시 에러 표시

- **WHEN** 업로드가 실패함 (네트워크 오류, 크기 초과 등)
- **THEN** 에러 메시지가 표시되고 미리보기가 제거됨

### Requirement: 프로필 이미지 업로드

프로필 편집 페이지에서 사용자는 프로필 사진과 커버 배너 이미지를 업로드할 수 있어야 한다.

- 프로필 사진: 드래그앤드롭 + 클릭, ImageUploader 컴포넌트 사용
- 커버 배너: 전체 너비, ImageUploader 컴포넌트 사용
- 업로드 완료 후 폼 제출 시 user.image, user.coverImage 업데이트

#### Scenario: 프로필 사진 업로드 및 저장

- **WHEN** 사용자가 프로필 편집에서 프로필 사진을 업로드하고 저장함
- **THEN** UploadThing에 업로드되고 DB user.image에 URL이 저장됨

#### Scenario: 커버 이미지 업로드 및 저장

- **WHEN** 사용자가 커버 배너 이미지를 업로드하고 저장함
- **THEN** UploadThing에 업로드되고 DB user.coverImage에 URL이 저장됨

#### Scenario: 프로필 이미지 삭제

- **WHEN** 사용자가 프로필 사진의 삭제 버튼을 클릭하고 저장함
- **THEN** DB user.image가 null로 업데이트됨

### Requirement: 일거리 썸네일 업로드

일거리 생성 폼(jobs-new)에 썸네일 업로드를 추가하고, 일거리 상세 페이지에서 작성자가 편집할 수 있어야 한다.

#### Scenario: 일거리 생성 시 썸네일 업로드

- **WHEN** 클라이언트가 일거리를 생성하면서 썸네일을 업로드함
- **THEN** UploadThing에 업로드되고 DB jobs.thumbnailUrl에 URL이 저장됨

#### Scenario: 일거리 상세에서 썸네일 편집

- **WHEN** 일거리 작성자가 상세 페이지에서 썸네일을 변경함
- **THEN** DB jobs.thumbnailUrl이 새 URL로 업데이트됨

#### Scenario: 일거리 상세에서 썸네일 삭제

- **WHEN** 일거리 작성자가 썸네일을 삭제함
- **THEN** DB jobs.thumbnailUrl이 null로 업데이트됨

### Requirement: DB 스키마 확장

user 테이블에 coverImage 컬럼을, jobs 테이블에 thumbnailUrl 컬럼을 추가해야 한다.

#### Scenario: 마이그레이션 실행

- **WHEN** Drizzle 마이그레이션이 실행됨
- **THEN** user 테이블에 coverImage TEXT(500) 컬럼이, jobs 테이블에 thumbnailUrl TEXT(500) 컬럼이 추가됨

### Requirement: UPLOADTHING_TOKEN 환경변수

모든 환경 파일(.env.local, .env.production, .env.example)에 UPLOADTHING_TOKEN을 포함해야 한다.

#### Scenario: 환경변수 누락 시 서버 시작 실패

- **WHEN** UPLOADTHING_TOKEN 없이 서버를 시작함
- **THEN** 업로드 관련 요청만 실패하고 나머지 앱은 정상 동작함
