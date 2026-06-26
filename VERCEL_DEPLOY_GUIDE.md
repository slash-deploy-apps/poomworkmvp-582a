# Vercel 배포 가이드 (React Router v7 + Turso DB)

이 앱은 **React Router v7 (SSR)** + **Drizzle ORM** + **SQLite/Turso** 스택입니다.  
Vercel에 배포하고, PR마다 독립된 DB를 가진 Preview 환경을 자동으로 만드는 방법을 설명합니다.

---

## 아키텍처 개요

```
GitHub PR 오픈
  │
  ├─ GitHub Actions: Turso에 브랜치 전용 DB 생성 (기존 DB 복제)
  │                  Drizzle 마이그레이션 실행
  │                  Vercel에 Preview 배포 트리거 (DATABASE_URL 주입)
  │
  └─ Vercel: Preview URL 생성 → PR에 댓글로 URL 게시

PR 머지 / 닫힘
  └─ GitHub Actions: Turso 브랜치 DB 삭제 (정리)
```

**왜 Turso인가?**  
Vercel은 서버리스(Serverless Functions) 환경이라 파일시스템이 읽기 전용입니다.  
`better-sqlite3`(로컬 파일 SQLite)는 `/tmp`에만 쓸 수 있고 요청 간 데이터가 사라집니다.  
→ **Turso**(libSQL 클라우드 SQLite)를 사용하면 서버리스에서도 영구 SQLite DB를 사용할 수 있습니다.  
이미 코드에 `@libsql/client`가 준비되어 있어 `DATABASE_URL`만 바꾸면 됩니다.

---

## 1단계: 코드 변경 (이미 완료됨)

아래 파일들이 이미 이 저장소에 추가되어 있습니다:

| 파일 | 설명 |
|------|------|
| `react-router.config.ts` | `vercelPreset()` 추가 |
| `vercel.json` | Vercel 프로젝트 설정 |
| `.github/workflows/vercel-preview.yml` | PR Preview 자동화 워크플로 |
| `.github/workflows/vercel-preview-cleanup.yml` | PR 닫힐 때 DB 정리 |
| `scripts/migrate.ts` | 런타임 마이그레이션 스크립트 |

---

## 2단계: Turso 설정

### 2-1. Turso CLI 설치 및 로그인
```bash
# macOS
brew install tursodatabase/tap/turso

# 로그인
turso auth login
```

### 2-2. Production DB 생성
```bash
# 프로덕션 DB 생성 (그룹 이름은 원하는 대로)
turso db create my-app-production --group default

# DB URL 확인
turso db show my-app-production --url
# 출력 예: libsql://my-app-production-orgname.turso.io

# Auth Token 생성
turso db tokens create my-app-production
```

### 2-3. Turso API Token 생성 (GitHub Actions용)
```bash
turso auth token
# 이 토큰은 GitHub Secret에 저장
```

### 2-4. Organization 이름 확인
```bash
turso org list
# 출력에서 slug 확인 (예: my-org)
```

---

## 3단계: Vercel 설정

### 3-1. Vercel 프로젝트 생성
1. [vercel.com](https://vercel.com) → **Add New Project**
2. GitHub 저장소 연결
3. Framework: **React Router** (자동 감지됨)
4. Build Command: `pnpm run build` (자동)
5. **Deploy** 클릭 (첫 배포)

### 3-2. Vercel 환경변수 설정
Vercel 대시보드 → Project → **Settings** → **Environment Variables**:

| 변수명 | 값 | 환경 |
|--------|-----|------|
| `DATABASE_URL` | `libsql://my-app-production-orgname.turso.io` | Production |
| `DATABASE_AUTH_TOKEN` | `<turso-auth-token>` | Production |
| `BETTER_AUTH_SECRET` | `<랜덤 32자 문자열>` | All |
| `PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Production |
| `UPLOADTHING_TOKEN` | `<uploadthing-token>` | All (선택) |

> **Preview 환경의 `DATABASE_URL`은 GitHub Actions가 동적으로 주입**하므로 여기서 설정하지 않아도 됩니다.

### 3-3. Vercel Token 발급 (GitHub Actions용)
Vercel 대시보드 → **Account Settings** → **Tokens** → **Create Token**  
→ 이름: `github-actions`, Scope: 전체

### 3-4. Vercel Project ID / Org ID 확인
```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 루트에서
vercel link  # 프로젝트 연결

# .vercel/project.json 에서 확인
cat .vercel/project.json
# { "orgId": "team_xxx", "projectId": "prj_xxx" }
```

---

## 4단계: GitHub Secrets 설정

GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret 이름 | 값 |
|-------------|-----|
| `VERCEL_TOKEN` | Vercel에서 발급한 토큰 |
| `VERCEL_ORG_ID` | `.vercel/project.json`의 `orgId` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json`의 `projectId` |
| `TURSO_API_TOKEN` | `turso auth token` 결과 |
| `TURSO_ORGANIZATION_NAME` | Turso org slug (예: `my-org`) |
| `TURSO_DATABASE_NAME` | 프로덕션 DB 이름 (예: `my-app-production`) |
| `TURSO_GROUP_NAME` | Turso 그룹 이름 (예: `default`) |
| `BETTER_AUTH_SECRET` | 랜덤 32자 문자열 |

---

## 5단계: Production DB 마이그레이션

```bash
# 로컬에서 프로덕션 DB에 마이그레이션 실행
DATABASE_URL=libsql://my-app-production-orgname.turso.io \
DATABASE_AUTH_TOKEN=<token> \
pnpm db:migrate

# 또는 시드 데이터 추가
DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=<token> pnpm db:seed
```

---

## 6단계: 동작 확인

1. GitHub에서 새 브랜치 생성 후 PR 오픈
2. **Actions** 탭에서 `Vercel Preview Deployment` 워크플로 실행 확인
3. 완료 후 PR에 Vercel Preview URL 댓글 확인
4. PR 닫으면 `Cleanup Preview DB` 워크플로가 Turso DB 삭제

---

## 비용 참고

| 서비스 | 무료 플랜 |
|--------|-----------|
| Vercel | Hobby: 무료 (Preview 배포 포함) |
| Turso | 500개 DB, 9GB 스토리지 무료 |
| GitHub Actions | Public repo 무료, Private repo 2,000분/월 무료 |

---

## 트러블슈팅

### `better-sqlite3` 관련 에러
Vercel 서버리스에서는 `better-sqlite3`가 동작하지 않습니다.  
`DATABASE_URL`을 반드시 `libsql://` 형식으로 설정하세요.

### Preview URL에서 인증이 안 될 때
`BETTER_AUTH_SECRET`이 모든 환경에 동일하게 설정되어 있는지 확인하세요.  
`PUBLIC_APP_URL`을 Preview URL로 설정하거나, `BETTER_AUTH_URL`을 동적으로 주입해야 합니다.  
(GitHub Actions 워크플로에서 `VERCEL_URL`을 `PUBLIC_APP_URL`로 전달하도록 이미 구성되어 있습니다.)

### Turso DB 이름 규칙
브랜치 이름에 `/`, `_`, 대문자가 있으면 Turso DB 이름으로 사용할 수 없습니다.  
워크플로에서 자동으로 소문자 + 하이픈으로 변환합니다.
