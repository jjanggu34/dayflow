# DAYFLOW — research.md

## AI 에이전트 역할·승인 (고정)

- 구현 전 반드시 **`docs/research.md` → `docs/plan.md`**를 작성·갱신하고 **사용자 승인**을 받는다.
- **승인 전에는 애플리케이션 코드를 작성하지 않는다.** (문서만 수정하는 단계는 예외)

## 프로젝트 요약

- **서비스명**: DAYFLOW
- **유형**: 모바일 웹, Vercel 정적 배포(HTML/CSS/JS만 사용, 서버 없음)
- **데이터**: 로컬 우선 **IndexedDB**, **Dexie.js**로 스키마·CRUD 관리. **Supabase**는 추후 연동 예정이며, 저장소 접근은 `diaryStore.js` 인터페이스로 추상화해 교체 비용을 최소화한다.
- **AI**: **Anthropic Claude API** 멀티모달(`claude-sonnet-4-6`), 감정 공감 일기 도우미 역할. API 키는 `apikeyManager.js`로 **localStorage** 관리.
- **입력**: 텍스트, 이미지(base64), **Web Speech API** STT → 텍스트.
- **UI**: **jQuery 1.12.4**(로컬 `assets/js/lib/jquery-1.12.4.js`), **Dexie.js**는 **CDN** `https://unpkg.com/dexie/dist/dexie.js` 로드. 공통 레이아웃은 `layout.js`에서 `fetch()`로 `views/common/*.html` 삽입. 하단 탭 5개(홈 / 챗봇 / 리포트 / 조언 / 나).
- **챗봇 흐름**: S2 감정 선택(`emotion.html`) — 사진 첨부 진입 시 **스킵** 후 `chat.html`로 이동, 분기는 `diaryFlow.js`.

## 전체 메뉴 (하단 탭 5)

| 탭     | 라우트 방향  | 내용                    |
| ------ | ------------ | ----------------------- |
| 홈     | `/home`      | 오늘 요약, 캘린더       |
| 챗봇   | `/chat` 계열 | 감정 선택 → 채팅 → 결과 |
| 리포트 | `/report`    | 패턴 분석, 월간 리포트  |
| 조언   | `/advice`    | AI 조언                 |
| 나     | `/my`        | 프로필, 설정            |

## 디렉토리 구조 현황

루트는 **`front/`** 기준이다. (상위 `dayflow/` 폴더명만 다를 수 있음 — **경로는 동일 트리**.)

| 구분                             | 상태                                                 |
| -------------------------------- | ---------------------------------------------------- |
| `index.html`, `vercel.json`      | 생성됨(골격)                                         |
| `docs/`                          | `research.md`, `plan.md` 존재                        |
| `views/common/`                  | `head`, `header`, `nav`, `footer`, `stepbar` — 골격  |
| `views/login.html`               | 골격                                                 |
| `views/home/home.html`           | 골격                                                 |
| `views/chat/`                    | `emotion.html`, `chat.html`, `result.html` — 골격    |
| `views/report/report.html`       | 골격                                                 |
| `views/advice/advice.html`       | 골격                                                 |
| `views/my/my.html`               | 골격                                                 |
| `assets/css/`                    | `common`~`popup`, `main`(@import) — 골격             |
| `assets/js/lib/jquery-1.12.4.js` | 생성됨(공식 min 번들)                                |
| `assets/js/config/db-config.js`  | 골격(주석)                                           |
| `assets/js/ui/com/`              | `input`, `layout`, `popup`, `calendar` — 골격        |
| `assets/js/agents/`              | `chatAgent`, `analysisAgent`, `apikeyManager` — 골격 |
| `assets/js/domain/`              | `diaryFlow`, `diaryStore` — 골격                     |
| `assets/js/view/`                | `login` ~ `my` — 골격                                |
| `assets/img/`                    | `.gitkeep` 등으로 디렉터리 유지                      |

**구현 상태**: 파일·라우트 골격 수준. CSS/JS 로직·Dexie·에이전트 본구현은 `plan.md` 단계별 승인 후 진행.

## 화면별 구현 현황

| 화면   | 경로(계획)                    | 역할                                   | 구현 |
| ------ | ----------------------------- | -------------------------------------- | ---- |
| 로그인 | `/login` → `views/login.html` | 로그인(화면·동작은 구현 단계에서 확정) | 없음 |
| 홈     | `/home`                       | 오늘 요약, 캘린더                      | 없음 |
| 챗 S2  | `/chat/emotion`               | 감정 6종, 사진 있으면 스킵             | 없음 |
| 챗 S3  | `/chat`                       | 통합 채팅(텍스트/사진/음성)            | 없음 |
| 챗 S5  | `/chat/result`                | Today 결과                             | 없음 |
| 리포트 | `/report`                     | 패턴 분석, 월간 리포트                 | 없음 |
| 조언   | `/advice`                     | AI 조언                                | 없음 |
| 나     | `/my`                         | 프로필, 설정                           | 없음 |

공통: 상단 헤더, 하단 탭바, 푸터, 챗봇 단계바는 `views/common/` + `layout.js`로 조합 예정.

## 조언 화면 포춘쿠키 팝업 현황 (2026-04-27)

- 대상 파일: `views/advice/advice.html`, `assets/js/view/advice.js`, `views/advice/fortune_popup.html`
- 현재 동작:
  - `#adviceFortuneBtn` 클릭 시 `openFortunePopup()`로 iframe 팝업 오픈
  - IndexedDB(`DayflowFortuneCookie.fortuneCookies.latest`)에 저장된 값이 없으면 조언 화면 첫 진입에서 자동 오픈
  - 포춘 내용은 `postMessage(type: "dayflow:fortune-revealed")` 수신 시 저장
- 확인된 이슈:
  - 요구사항은 "초기 미노출, 버튼 클릭 시만 노출"인데 현재는 첫 진입 자동 오픈 로직이 있음
  - "하루 지나면 다시 열 수 있게"를 위한 날짜 경계 체크(당일/익일 판별)가 저장값 읽기 로직에 없음
- 구현 시 고려사항:
  - 저장 스키마(`savedAt`)를 활용해 로컬 날짜 기준 당일 여부 판별 함수 추가
  - 당일 이미 확인한 경우 버튼 클릭 시 팝업 미오픈 + 안내 문구(또는 버튼 상태) 처리
  - 다음날(00:00 경과 후) 자동으로 다시 오픈 가능 상태로 전환

## 데이터 흐름 (IndexedDB 기준)

1. **스키마(`db-config.js`, Dexie)**
   - DB명: `DayflowDB`
   - `diaries`: `++id`, `date`, `emotion`, `content`, `summary`, `imageBase64`, `createdAt`
   - `emotions`: `++id`, `date`, `type`, `score`
   - `settings`: `key`, `value`

2. **쓰기 흐름(예상)**
   - 챗봇/일기 완료 → `analysisAgent` 등으로 요약·감정 태그 생성 → `diaryStore`가 `diaries`/`emotions`에 저장.
   - 설정·API 키 존재 여부: `settings` vs `localStorage`(API 키 전용) 병행 — 키는 명세상 `apikeyManager`만 사용.

3. **읽기 흐름(예상)**
   - 홈/캘린더: `date` 기준 `diaries` 조회.
   - 리포트: 기간 집계, `emotions`·`diaries` 조합.
   - `diaryFlow`: 진행 중 세션 상태(사진 유무 등)는 메모리+필요 시 `settings` 또는 쿼리스트링/세션 스토어로 보완 가능(구현 단계에서 확정).

## 에이전트 구조

### 현재 구현 대상 (에이전트 모듈)

| 모듈               | 역할                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------- |
| `chatAgent.js`     | **채팅 중** Claude API 호출. 텍스트 / 이미지 분기(음성은 STT로 텍스트화 후 동일 경로). |
| `analysisAgent.js` | 대화 **종료 후** 감정 요약 및 **태깅**(저장 포맷·`emotions` 등과 연계).                |
| `apikeyManager.js` | API 키 **localStorage** 저장·조회.                                                     |

### 추후 추가 에이전트 (지금은 구현 금지)

아래는 **별도 시점·승인 후**에만 파일을 추가하거나 구현한다. 초기 스코프에 넣지 않는다.

| 예정 모듈        | 도입 시점(가이드)                                        |
| ---------------- | -------------------------------------------------------- |
| `voiceAgent.js`  | 음성 처리 로직이 복잡해질 때(Web Speech만으로 부족할 때) |
| `reportAgent.js` | 주간/월간 리포트 **생성** AI가 붙을 때                   |
| `adviceAgent.js` | 조언 탭에 **전용** AI 로직을 붙일 때                     |

### chatAgent.js 핵심 스펙 (고정)

- **입력 타입**: `text` / `image` / `voice` (Web Speech API → STT → 텍스트로 통일).
- **이미지**: `FileReader`로 base64 변환 → Claude API **image 블록**으로 전송.
- **엔드포인트**: `https://api.anthropic.com/v1/messages`
- **모델**: `claude-sonnet-4-6` (배포 전 공식 모델 ID 재확인).
- **시스템 프롬프트**: 감정 공감 일기 도우미.
- **API 키**: `apikeyManager.js` → localStorage 조회.
- **응답 목적**: 감정 분석 + 공감 대화.

### S2 감정 선택 로직 (고정)

- 사진 **없이** 진입 → `emotion.html`에서 감정 6가지 선택.
- 사진 **첨부** 진입 → `emotion.html` **스킵** → `chat.html`로 이동.
- 분기: `diaryFlow.js`.

## CSS 역할 분리 (고정)

| 파일         | 역할                                                                   |
| ------------ | ---------------------------------------------------------------------- |
| `common.css` | CSS 변수(color, font, spacing), reset, 공통 유틸                       |
| `layout.css` | header, 하단 탭바, footer, 페이지 래퍼, 그리드                         |
| `button.css` | `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`                 |
| `form.css`   | input, textarea, select, label, 유효성 상태                            |
| `popup.css`  | overlay, modal, bottom-sheet, apikey-overlay                           |
| `main.css`   | 위 5개 `@import` — **각 페이지 `<head>`에서는 `main.css` 하나만 로드** |

## 공통 JS 컴포넌트 규칙 (고정)

| 모듈          | 규칙                                  |
| ------------- | ------------------------------------- |
| `popup.js`    | `openPopup(id)`, `closePopup(id)`     |
| `input.js`    | `initInput()`, 페이지별 콜백 주입     |
| `layout.js`   | `fetch()`로 `common/*.html` 동적 삽입 |
| `calendar.js` | `initCalendar(selector, options)`     |

## vercel.json 라우팅 (고정)

| URL             | 파일                       |
| --------------- | -------------------------- |
| `/`             | `index.html`               |
| `/login`        | `views/login.html`         |
| `/home`         | `views/home/home.html`     |
| `/chat/emotion` | `views/chat/emotion.html`  |
| `/chat`         | `views/chat/chat.html`     |
| `/chat/result`  | `views/chat/result.html`   |
| `/report`       | `views/report/report.html` |
| `/advice`       | `views/advice/advice.html` |
| `/my`           | `views/my/my.html`         |

## docs/ 작성 규칙 (research·plan 형식)

**research.md에 포함할 항목**

- 프로젝트 요약
- 디렉토리 구조 현황
- 화면별 구현 현황
- 데이터 흐름 (IndexedDB 기준)
- 에이전트 구조
- 리스크
- 다음 단계 제안 (Supabase 마이그레이션 시점 포함)

**plan.md에 포함할 항목**

- 목표
- 범위 / 비범위
- 수정 파일 목록
- 단계별 작업 순서
- 상태/데이터 구조
- 예외 처리
- 테스트 체크리스트
- 완료 기준

## 리스크

1. **Claude API·모델명**: `claude-sonnet-4-6`은 제품/문서 기준명과 불일치 시 400 오류 가능. 연동 시 공식 모델 ID 재확인 필요.
2. **CORS**: 브라우저에서 Anthropic API 직접 호출 시 **CORS 정책**으로 차단될 수 있음. 차단 시 **경량 프록시(Edge Function 등)** 또는 사용자 확장 없이는 로컬 개발만 가능할 수 있음 — 배포 전 검증 필수.
3. **API 키 노출**: 정적 프론트만으로는 키 유출 위험. MVP는 localStorage이나, 공개 배포 시 서버리스 프록시·제한 키 정책 검토 권장.
4. **Web Speech API**: 브라우저·언어·HTTPS 의존, iOS Safari 동작 차이. STT 실패 시 텍스트 입력 폴백 필요.
5. **IndexedDB 용량·이미지**: `imageBase64` 대량 저장 시 용량·성능 이슈. 압축·썸네일·저해상도 정책 검토.
6. **jQuery 1.12.4**: 구버전 보안·유지보수 이슈. 요구사항 준수하되 신규 의존 추가는 최소화.
7. **부분 HTML + fetch**: 로컬 `file://` 열람 시 CORS로 fetch 실패 가능. 개발은 **정적 서버 또는 Vercel** 기준 권장.

## 다음 단계 제안 (Supabase 마이그레이션 시점 포함)

1. **승인 후**: 디렉토리 및 빈 파일 스캐폴딩 → CSS 5분할 + `main.css` → 공통 JS(`layout`, `popup`, `input`, `calendar`) → `db-config` + `diaryStore` 스텁.
2. **login → home → chat 흐름** 순으로 동작 검증.
3. **CORS/API**: 개발 중 실제 호출로 검증; 막히면 Vercel Serverless/Edge 프록시를 `plan`에 반영.
4. **Supabase 연동 시점**: 다기기 동기화·백업·비로그인 복구가 필요해질 때. 그 전까지는 `diaryStore.js`만 인터페이스 유지하고 구현체를 `Dexie` 구현으로 고정. 마이그레이션 시 동일 인터페이스의 `supabaseDiaryStore` 등으로 스왑.

---

_본 문서는 구현 전 조사·정리용이며, 승인 후 `plan.md` 순서에 따라 코드가 추가된다._
