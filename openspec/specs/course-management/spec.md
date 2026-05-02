## ADDED Requirements

### Requirement: 강좌 생성 페이지

`/courses/new` 라우트에 강좌 생성 페이지를 제공해야 한다. 강좌 생성 폼은 다음 필드를 포함한다:

- 제목 (필수)
- 설명 (필수)
- 카테고리 선택
- 썸네일 이미지 업로드 (ImageUploader 컴포넌트)
- 가격
- 난이도 (beginner, intermediate, advanced)
- 소요 시간

접근 권한: 로그인한 모든 사용자 (향후 강사 권한 분리 가능).

#### Scenario: 강좌 생성 성공

- **WHEN** 사용자가 필수 필드를 채우고 썸네일을 업로드한 후 생성 버튼을 클릭함
- **THEN** DB에 강좌가 생성되고 courses.thumbnailUrl에 이미지 URL이 저장됨

#### Scenario: 썸네일 없이 강좌 생성

- **WHEN** 사용자가 썸네일 없이 강좌를 생성함
- **THEN** 강좌는 생성되나 thumbnailUrl은 null임

#### Scenario: 미인증 사용자 접근 차단

- **WHEN** 로그인하지 않은 사용자가 /courses/new에 접근함
- **THEN** /login으로 리다이렉트됨

### Requirement: 강좌 상세 편집 기능

강좌 상세 페이지(`/courses/:courseId`)에서 강사(작성자)만 볼 수 있는 편집 버튼을 표시해야 한다. 편집 버튼 클릭 시 편집 모달 또는 인라인 편집 모드로 전환되어 썸네일을 포함한 강좌 정보를 수정할 수 있다.

#### Scenario: 강사가 자신의 강좌 편집

- **WHEN** 강좌 작성자가 상세 페이지에서 편집 버튼을 클릭함
- **THEN** 편집 모달이 열리고 썸네일을 포함한 모든 필드를 수정할 수 있음

#### Scenario: 비작성자는 편집 버튼 미표시

- **WHEN** 다른 사용자가 강좌 상세 페이지를 봄
- **THEN** 편집 버튼이 표시되지 않음

#### Scenario: 썸네일 변경

- **WHEN** 강사가 편집 모달에서 썸네일을 새 이미지로 교체함
- **THEN** DB courses.thumbnailUrl이 새 URL로 업데이트됨

### Requirement: 대시보드에 강좌 생성 버튼

대시보드(`/dashboard`)에 '새 강좌 만들기' 버튼을 추가하여 `/courses/new`로 이동할 수 있어야 한다.

#### Scenario: 강좌 생성 버튼 표시

- **WHEN** 로그인한 사용자가 대시보드를 봄
- **THEN** '새 강좌 만들기' 버튼이 표시되고 클릭 시 /courses/new로 이동함

### Requirement: 강좌 목록에 썸네일 표시

강좌 목록(`/courses`)과 강좌 상세에서 썸네일이 있으면 이미지를, 없으면 기존 그라데이션 placeholder를 표시해야 한다.

#### Scenario: 썸네일이 있는 강좌 표시

- **WHEN** 강좌에 thumbnailUrl이 있음
- **THEN** 썸네일 이미지가 표시됨

#### Scenario: 썸네일이 없는 강좌 표시

- **WHEN** 강좌에 thumbnailUrl이 null임
- **THEN** 기존 그라데이션 placeholder가 표시됨



### Requirement: Course purchase creates enrollment after payment

The course purchase action SHALL only create an enrollment after successful payment confirmation.

#### Scenario: Paid course purchase flow

- **WHEN** a user initiates purchase of a paid course
- **THEN** the system creates a PENDING payment record
- **AND** renders the TossPayments widget
- **AND** upon successful payment confirmation, creates the enrollment
- **AND** redirects to the learning page
- **AND** if payment fails, no enrollment is created

#### Scenario: Free course enrollment

- **WHEN** a user enrolls in a free course
- **THEN** no payment record is created (or a zero-amount record is created)
- **AND** the enrollment is created immediately
- **AND** the user is redirected to the learning page