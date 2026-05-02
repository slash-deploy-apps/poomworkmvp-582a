---
name: tosspayments-docs
description: 'MCP-compatible toolset for integrating with tosspayments systems. Includes tools for retrieving LLM-structured text and fetching actual documentation through URLs. (토스페이먼츠 시스템과의 연동을 위한 MCP 도구 모음입니다. LLM이 활용할 수 있는 텍스트 및 관련 문서를 가져오는 기능을 포함합니다.)'
allowed-tools: 'Bash(node */toss-payments-agent-skills/scripts/cli.js:*)'
---

# TossPayments 결제 연동 가이드 Agent Skill

## 도구 목록

### `get-v2-documents` → `search --version v2`

토스페이먼츠 v2 문서들을 조회합니다. 명시적으로 유저가 버전에 관련된 질의가 없다면 사용해주세요.

```bash
node <path>/scripts/cli.js search --version v2 --keywords <keyword1> [keyword2 ...]
```

### `get-v1-documents` → `search --version v1`

토스페이먼츠 v1 문서들을 조회합니다. 명시적으로 유저가 버전1을 질의하는 경우 사용해주세요.

```bash
node <path>/scripts/cli.js search --version v1 --keywords <keyword1> [keyword2 ...]
```

### `document-by-id` → `get --id`

문서의 원본 ID 로 해당 문서의 전체 내용을 조회합니다.

```bash
node <path>/scripts/cli.js get --id <number>
```

## 파라미터

### keywords

검색할 키워드 배열. 예: ['결제위젯', '연동'] - 관련성이 높은 문서를 찾기 위한 핵심 단어들

### searchMode

검색 모드에 따라 결과의 관련성과 정확도가 달라집니다.

검색 모드:

- broad: 폭넓은 결과 (관련성 낮아도 포함, 개념 탐색 시)
- balanced: 균형잡힌 결과 (일반적인 검색)
- precise: 정확한 결과만 (정확한 답변 필요 시)

CLI에서는 `--mode <broad|balanced|precise>` 플래그로 지정합니다 (기본값: `balanced`).

### maxTokens

응답에 포함할 최대 토큰 수입니다. 허용가능한 토큰 숫자는 500에서 50000 사이입니다.

권장값:

- 1000: 간단한 답변 (빠른 응답)
- 10000: 균형잡힌 상세도
- 25000: 매우 상세한 분석 (기본값)
- 50000: 최대 상세도 (긴 문서나 복잡한 내용) 단, 허용가능한 토큰의 크기를 초과할 수 있으므로 주의가 필요합니다.

CLI에서는 `--max-tokens <number>` 플래그로 지정합니다.

## 사용 가이드

유저의 질의를 분석하여 적절한 키워드와 카테고리를 추출 후 요청주세요.

### 파라미터 형식

```
{
  "keywords": string[]     // 질의에서 도출된 주요 키워드 (UTF-8 문자열 배열)
  "searchMode": "broad" | "balanced" | "precise" // 검색 모드 (기본값: "balanced")
  "maxTokens": number // 응답에 포함할 최대 토큰 수 (기본값: 25000, 최소: 500, 최대: 50000)
}
```

### 탐색 방법:

허용하는 토큰의 범위는 500에서 50000 사이입니다.

### searchMode 사용법:

• broad: "결제 관련해서 뭐가 있는지 둘러보고 싶어"
• balanced: "결제위젯 연동 방법을 알고 싶어"
• precise: "정확히 이 에러코드가 뭘 의미하는지 알고 싶어"

### 예제 모음

#### case 1

User: 토스페이먼츠 결제위젯을 연동하고 싶어
Assistant: { "keywords": ["결제위젯", "연동"] }

#### case 2

User: 토스에서 카드 승인 실패는 어떤 케이스가 있나요?
Assistant: { "keywords": ["카드", "승인", "실패"] }

#### case 3

User: 비인증 결제가 뭐야?
Assistant: { "keywords": ["비인증 결제"] }

#### case 4

User: SDK로 어떻게 연동하죠?
Assistant: { "keywords": ["sdk", "연동"] }

#### case 5

User: 정책적으로 제한되는 부분이 있을까요?
Assistant: { "keywords": ["정책", "제한"] }

## V1 사용 가이드

명시적으로 유저가 버전1을 질의하는 경우 사용해주세요.

유저의 질의를 분석하여 적절한 키워드를 추출 후 요청주세요.

### 예제 모음

#### case 1

User: 토스페이먼츠 결제위젯을 버전1으로 연동하고 싶어
Assistant: { "keywords": ["결제위젯", "연동"] }

#### case 2

User: 토스페이먼츠 version1 sdk에서 오류가 나요
Assistant: { "keywords": ["sdk", "오류"] }

#### case 3

User: 결제창 v1 에서 카드 결제는 어떻게 하나요?
Assistant: { "keywords": ["카드", "결제", "flow"] }

## CLI 사용법

### `search` 커맨드

```bash
node <path>/scripts/cli.js search --version <v1|v2> --keywords <word1> [word2 ...] [--mode <broad|balanced|precise>] [--max-tokens <number>] [--top <n>] [--refresh]
```

| 플래그         | 타입                       | 기본값     | 설명                                |
| -------------- | -------------------------- | ---------- | ----------------------------------- |
| `--version`    | `v1\|v2`                   | 필수       | 검색할 API 버전                     |
| `--keywords`   | `string[]`                 | 필수       | 검색 키워드 (공백으로 여러 개 입력) |
| `--mode`       | `broad\|balanced\|precise` | `balanced` | searchMode                          |
| `--max-tokens` | `number`                   | `25000`    | maxTokens                           |
| `--top`        | `number`                   | `10`       | 반환할 최대 결과 수                 |
| `--refresh`    | `boolean`                  | `false`    | 캐시를 무시하고 CDN에서 재다운로드  |

### `get` 커맨드

```bash
node <path>/scripts/cli.js get --id <number> [--refresh]
```

| 플래그      | 타입      | 기본값  | 설명                                       |
| ----------- | --------- | ------- | ------------------------------------------ |
| `--id`      | `number`  | 필수    | 조회할 문서의 원본 ID (검색 결과에서 확인) |
| `--refresh` | `boolean` | `false` | 캐시를 무시하고 CDN에서 재다운로드         |

### 캐시

- 첫 실행 시 CDN(`docs.tosspayments.com/llms.txt`)에서 문서를 자동으로 가져와 로컬 캐시(`.cache/documents.json`)에 저장합니다.
- 캐시 유효 기간은 24시간입니다. 이후 실행은 캐시에서 즉시 로딩됩니다.
- 문서가 최신화되지 않은 것 같으면 `--refresh` 플래그를 사용하세요.

## Reference Docs

- [`references/v2-api-overview.md`](references/v2-api-overview.md) — 검색 엔진 내부 설정 (동의어 사전, 카테고리 가중치, 검색 모드 BM25 파라미터)
