# DAYFLOW — plan.md

## AI 에이전트 역할·승인 게이트 (고정)

- 구현 전 반드시 **`docs/research.md` → `docs/plan.md`** 작성 후 **사용자 승인**을 받는다.
- **승인 전 코드 작성 금지.** (앱 코드·`vercel.json`·`views/`·`assets/` 구현; 문서만 수정하는 것은 예외)

## 목표

- Vercel 정적 배포 가능한 **모바일 웹** 골격을 갖춘다.
- **jQuery + Dexie(CDN) + Claude(멀티모달) + Web Speech** 요구사항에 맞는 파일 구조·역할 분리를 확정한다.
- **승인 단계별**로 스캐폴딩 → 공통 레이어 → DB → 로그인 → 화면별 순 구현한다.
- 상세 명세(CSS 5분할, 공통 JS API, `chatAgent` 엔드포인트, `vercel.json` 매핑 등)는 **`docs/research.md`**에 보존한다.

## 범위 / 비범위

**범위**

- 요청한 디렉토리·파일 트리 생성 및 단계별 구현.
- `vercel.json` 라우팅, `views/common` 조합, CSS 5파일 + `main.css` 단일 로드.
- Dexie 스키마(`DayflowDB`), `diaryStore` 추상화, `chatAgent`/`analysisAgent`/`apikeyManager` 기본 동작.
- S2 감정 화면 스킵 로직(`diaryFlow.js`, 사진 유무 분기).
- 탭 5개 네비게이션, 각 뷰 최소 UI 및 라우트 연결.

**비범위 (초기 단계)**

- Supabase 연동(추후 `diaryStore` 구현체만 교체).
- 서버사이드 인증·결제·푸시.
- PWA 오프라인 캐시 전략(필요 시 후속).
- Claude API 프록시(필요해지면 별도 작업으로 범위 확장).
- **추후 에이전트**(`voiceAgent`, `reportAgent`, `adviceAgent`) — `research.md`의 도입 시점 가이드 전까지 **파일 추가·구현 금지**.

## 수정 파일 목록 (예상 전체)

_승인 후 단계마다 실제 생성·수정됨._

| 단계       | 대상                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------- |
| 스캐폴딩   | `index.html`, `vercel.json`, 전체 `views/**`, `assets/**` 빈 파일 또는 골격              |
| CSS        | `assets/css/common.css`, `layout.css`, `button.css`, `form.css`, `popup.css`, `main.css` |
| 공통 JS    | `assets/js/ui/com/layout.js`, `popup.js`, `input.js`, `calendar.js`                      |
| DB         | `assets/js/config/db-config.js`, `assets/js/domain/diaryStore.js`                        |
| 에이전트   | `assets/js/agents/chatAgent.js`, `analysisAgent.js`, `apikeyManager.js`                  |
| 도메인     | `assets/js/domain/diaryFlow.js`                                                          |
| 뷰         | `assets/js/view/*.js`, 각 `views/**/*.html`, `views/common/*.html`                       |
| 라이브러리 | `assets/js/lib/jquery-1.12.4.js`                                                         |

## 단계별 작업 순서 (원문 요구사항, 승인 게이트 포함)

각 단계마다 **사용자 승인**이 필요할 수 있다. 특히 **4번·9번**은 구현 전/중간 게이트로 둔다.

| 순서 | 작업                                                                                     |
| ---- | ---------------------------------------------------------------------------------------- |
| 1    | 전체 디렉토리 + 빈 파일 생성                                                             |
| 2    | `docs/research.md` 작성                                                                  |
| 3    | `docs/plan.md` 작성                                                                      |
| 4    | **↓ 사용자 승인 대기 ↓**                                                                 |
| 5    | `main.css` 및 CSS 5개 파일 (모바일 우선)                                                 |
| 6    | 공통 JS: `layout.js`, `popup.js`, `input.js`, `calendar.js`                              |
| 7    | `db-config.js` (Dexie.js 스키마)                                                         |
| 8    | `login.html` + `login.js`                                                                |
| 9    | **↓ 사용자 승인 대기 ↓**                                                                 |
| 10   | 이후 화면별 순차 진행 (`home` → `chat` emotion/chat/result → `report` → `advice` → `my`) |

**참고**: `vercel.json` 라우팅·`chatAgent` 스펙·S2 스킵 로직 등은 **`research.md`** 표와 동일하게 구현한다.

## 상태 / 데이터 구조

**IndexedDB (Dexie)**

- `diaries`: 일기 본문·요약·이미지·날짜·감정 문자열 등.
- `emotions`: 날짜·유형·점수 등 정량/분류 보조.
- `settings`: 앱 설정 키-값.

**localStorage**

- Claude API 키: `apikeyManager.js` 전담(스키마 `settings`와 중복 저장은 지양, 단일 소스 권장).

**챗봇 진행 상태**

- `diaryFlow.js`: 현재 단계, **사진 첨부 여부**(S2 스킵), 선택 감정 등. 세션 스토어 vs 메모리는 구현 시 한 가지로 통일.

## 예외 처리

| 상황                        | 대응                                                                              |
| --------------------------- | --------------------------------------------------------------------------------- |
| API 키 없음                 | 조언/챗봇 진입 시 안내 오버레이 또는 설정 유도(`popup` + `apikeyManager`).        |
| Claude API 오류·CORS        | 사용자 메시지 + 재시도; CORS 불가 시 문서화 후 프록시 작업을 별 승인 범위로 추가. |
| STT 미지원/권한 거부        | 음성 버튼 비활성 또는 텍스트만 안내.                                              |
| IndexedDB 열기 실패         | 저장 스킵 경고, 읽기 빈 상태.                                                     |
| `fetch`로 partial HTML 실패 | `layout.js`에서 콘솔/토스트, 빈 레이아웃 방지용 폴백 메시지.                      |
| 이미지 과대                 | 파일 크기 상한·압축(선택) 및 사용자 안내.                                         |

## 테스트 체크리스트

- [ ] Vercel(또는 `vercel dev`)에서 `/`, `/login`, `/home`, `/chat`, `/chat/emotion`, `/chat/result`, `/report`, `/advice`, `/my` 모두 200.
- [ ] `main.css` 한 번만 로드, 탭 전환 시 레이아웃 깨짐 없음.
- [ ] Dexie 업그레이드 없이 최초 오픈 시 테이블 생성.
- [ ] API 키 저장·삭제·조회 후 메시지 전송 가능(네트워크/CORS 환경 의존).
- [ ] 사진 없음 → emotion 노출; 사진 있음 → emotion 스킵 → chat.
- [ ] 음성: 지원 브라우저에서 STT 텍스트가 입력으로 전달(미지원 브라우저 폴백).

## 완료 기준

- 상기 디렉토리 구조가 저장소에 반영되고, **모든 주요 라우트**가 HTML을 반환한다.
- 공통 레이아웃·탭바·CSS 역할 분리 규칙이 문서와 일치한다.
- `DayflowDB` 스키마가 명세와 일치하고 `diaryStore`가 교체 가능한 경계로 작성된다.
- 챗봇 핵심 경로(감정 → 채팅 → 결과, 사진 시 S2 스킵)가 end-to-end로 동작한다( API 키·네트워크 조건 충족 시).
- `research.md` 리스크(CORS 등)가 재현되면 이슈로 남기고 완화 방안이 `plan` 후속에 반영된다.

---

**승인 요청**: 디렉터리·골격이 이미 있다면 **5단계(CSS)**부터 승인 범위를 정하면 된다. 처음부터라면 **디렉터리 + 빈 파일**부터 진행한다. 수정·추가 요구는 본 `plan.md` 인라인 메모 또는 채팅으로 알려 주세요.

---

## 요구사항 명세 보존 위치 (사라지지 않게)

- **원문 수준의 고정 항목**(역할·승인, CSS/JS 규칙, `chatAgent`, `vercel.json` 매핑, Dexie CDN, `docs/` 형식)은 **`docs/research.md`**에 통합해 두었다.
- 이 **`plan.md`**는 목표·범위·단계·테스트·완료 기준을 담는다.
- 채팅 요약만으로 끝내지 않고, 변경 시 **두 문서 중 하나**를 반드시 갱신한다.

---

## 운영 규칙 (커서 세션 관리)

- **research → plan → implement** 를 가능하면 **하나의 긴 세션**으로 유지한다. 세션을 나누면 맥락 손실이 나기 쉽다.
- 잘못된 방향이 보이면 **잔 패치로 끌고 가지 말고**, **Git reset** 등으로 되돌린 뒤 **`plan.md` 범위를 재설정**하고 다시 시작하는 편이 빠를 수 있다.
- 프론트엔드 수정 요청은 **말로만 설명하기보다 스크린샷 첨부**를 우선한다.
- `plan.md` 검토 시 에디터에 **인라인 메모**를 남긴 뒤, AI에는 예를 들어 다음처럼 지시한다:  
  **「메모 반영해서 plan.md 업데이트해라. 아직 구현 금지」**
