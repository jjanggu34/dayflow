# DAYFLOW — 전체 소스 분석 및 작업 방식 문서

## 문서 목적

- 이 문서는 DAYFLOW 레포를 빠르게 파악하고, 신규 작업자가 동일한 방식으로 작업할 수 있도록 정리한 운영 기준서다.
- 대상 범위는 `/dayflow` 루트 전체이며, 실제 앱 구현 기준은 `front/` 디렉터리다.

## 프로젝트 한 줄 요약

- 감정 일기 웹앱으로, 사용자가 감정을 선택하고 AI와 대화한 뒤 기록/리포트/조언을 확인하는 구조다.
- 프론트는 정적 웹(HTML/CSS/Vanilla JS + jQuery), 백엔드는 Vercel Serverless(`api/chat.js`) 중심의 경량 프록시 구조다.

## 최상위 구조와 역할

| 경로          | 역할                                                      |
| ------------- | --------------------------------------------------------- |
| `front/`      | 실제 서비스 코드(화면, 스타일, 클라이언트 로직, 문서)     |
| `api/`        | 서버리스 API 엔드포인트 (`chat.js`)                       |
| `scripts/`    | 로컬 실행/빌드 유틸 (`dev-front.mjs`, `build-static.mjs`) |
| `dist/`       | 정적 빌드 출력물                                          |
| `vercel.json` | 라우팅, 헤더/CSP, 리라이트 정책                           |
| `frontend/`   | 현재 앱 본체와 분리된 잔존 산출물 폴더(.vite 등)          |
| `자료/`       | 디자인 참고 이미지                                        |

## 앱 소스 기준 구조 (`front/`)

| 경로                      | 역할                                                          |
| ------------------------- | ------------------------------------------------------------- |
| `front/index.html`        | 루트 진입점(랜딩/리다이렉트)                                  |
| `front/views/`            | 화면 HTML (`main`, `chat`, `report`, `advice`, `my`, `login`) |
| `front/views/common/`     | 공통 조각(헤더/푸터/네비/스텝바)                              |
| `front/assets/css/`       | 전역/화면 스타일                                              |
| `front/assets/js/view/`   | 화면별 컨트롤러 스크립트                                      |
| `front/assets/js/domain/` | 도메인 로직(`diaryFlow`, `diaryStore`)                        |
| `front/assets/js/agents/` | AI 연동(`chatAgent`, `analysisAgent`, `apikeyManager`)        |
| `front/assets/js/config/` | IndexedDB 설정(`db-config`)                                   |
| `front/assets/js/ui/com/` | 공통 UI 유틸(`layout`, `popup`, `calendar`, `input`)          |
| `front/docs/`             | RPD 문서(`research.md`, `plan.md`)                            |

## 기술 스택 및 런타임

- **UI**: HTML + CSS + Vanilla JS, 보조로 jQuery 1.12.4 사용
- **데이터 저장**: IndexedDB(Dexie) + 일부 `sessionStorage`/`localStorage`
- **AI**: Anthropic Claude API(직접 또는 `/api/chat` 프록시 경유)
- **배포**: Vercel 정적 배포 + 서버리스 함수
- **빌드 도구**: 프론트 번들러 없이 정적 파일 중심 운영

## 사용자 기능 흐름 (실제 작업 기준)

1. `/` 진입 후 `/main` 이동
2. 감정 선택(`/chat/emotion`) -> 채팅(`/chat`) -> 결과(`/chat/result`)
3. 일기/감정 데이터는 IndexedDB에 저장
4. 리포트(`/report`)는 저장 데이터 집계 기반
5. 조언(`/advice`)은 최신 일기/상황 데이터 기반으로 생성

## 데이터 및 API 흐름

### 클라이언트 저장

- 메인 DB: `DayflowDB`
  - `diaries`: 일기 본문, 요약, 감정, 이미지, 작성시각
  - `emotions`: 날짜별 감정 타입/점수
  - `settings`: 앱 설정 키-값
- 보조 저장:
  - `sessionStorage`: 현재 플로우 상태(감정 선택값 등)
  - `localStorage`: API 키 및 사용자 옵션 일부

### 네트워크

- `/api/chat` -> Anthropic API 프록시 (`api/chat.js`)
- `/api/open-meteo/*` -> `vercel.json` 리라이트를 통해 외부 날씨 API 연결

## 실제 개발 루틴 (어떻게 작업하는지)

### 1) 문서 우선 (RPD)

- `docs/research.md`에서 현재 구조/리스크를 먼저 정리한다.
- 구현 전 `docs/plan.md`에 목표/범위/파일/테스트 체크리스트를 확정한다.
- 승인 전에는 앱 코드(`views/`, `assets/`, `index.html`, `vercel.json`)를 수정하지 않는다.

### 2) 구현 작업 순서

- 화면 구조 변경: `front/views/`
- 화면 동작 변경: `front/assets/js/view/`
- 데이터/AI 로직: `front/assets/js/domain/`, `front/assets/js/agents/`, `api/chat.js`
- 스타일 조정: `front/assets/css/`

### 3) 로컬 실행과 검증

- 개발 실행: `npm run dev`
- 빌드: `npm run build`
- 라우트 점검: `/main`, `/chat/emotion`, `/chat`, `/chat/result`, `/report`, `/advice`
- 저장 점검: IndexedDB 저장/조회, 새로고침/재진입 동작

## 리스크 및 주의사항

1. **API 키 보안**: `localStorage` 저장은 노출 위험이 있어 운영 환경에서는 프록시/정책 보강 필요
2. **CORS 차이**: 로컬 실행 방식에 따라 Anthropic/날씨 API 동작이 달라질 수 있음
3. **상태 의존성**: `sessionStorage` 기반 플로우는 직접 URL 접근/새로고침 시 분기 예외 가능
4. **데이터 용량**: 이미지 base64 저장 누적 시 IndexedDB 용량/성능 이슈 가능
5. **폴더 혼동**: `front/`가 본체이며 `frontend/`는 현재 기준 보조/잔존 폴더

## 추천 운영 원칙

- 화면 수정은 항상 “HTML -> view JS -> domain/agent -> CSS” 순서로 영향 범위를 추적한다.
- 기능 추가 시 저장 스키마 영향(IndexedDB)을 먼저 검토하고, 이후 UI를 맞춘다.
- AI 기능 변경 시 프롬프트/응답 파서/폴백 메시지를 세트로 점검한다.
- 배포 전에는 라우팅(`vercel.json`)과 클라이언트 경로 참조를 함께 검증한다.

---

마지막 업데이트: 2026-04-27  
기준: `/dayflow` 전체 소스 탐색 결과 반영
