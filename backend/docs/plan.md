# DAYFLOW — 백엔드 plan.md (현행 작업 계획)

## 승인 게이트

- 작업 순서는 `research -> plan -> implement`를 따른다.
- 구현 전에는 `backend/docs/research.md`와 `backend/docs/plan.md`를 최신화하고 사용자 승인을 받는다.
- 승인 전에는 `schema.sql`, `policies.sql`, `supabase-config.js`, `supabaseStore.js`, `authAgent.js`, `vercel.json` 수정 금지.

---

## 현재 목표

- Supabase 연동 초기 세팅을 완료하고 프론트와 연결한다.
- 기존 Dexie(IndexedDB) 저장 흐름을 Supabase 저장 흐름으로 교체한다.
- 로그인/로그아웃 화면을 구현하고 세션 기반 접근 제어를 적용한다.

---

## 범위

### 포함

- Supabase 프로젝트 세팅 (콘솔 작업)
- DB 스키마 + RLS 정책 실행
- 프론트 Supabase 클라이언트 초기화 (`supabase-config.js`)
- 인증 에이전트 구현 (`authAgent.js`)
- 데이터 저장 교체 (`diaryStore.js` → `supabaseStore.js`)
- 로그인 화면 구현 (`login.html` + `login.js`)
- CSP(`vercel.json`) Supabase 도메인 추가

### 제외

- Supabase Storage (이미지 저장 이관) — image_base64 유지
- Google OAuth 연동 — 이메일 로그인 우선
- 기존 IndexedDB 데이터 마이그레이션 — 신규 가입 기준으로 진행
- 오프라인 큐(IndexedDB 임시 저장) — 1차 연동 후 검토

---

## 구현 우선순위

### 1단계 — Supabase 콘솔 세팅 (코드 작업 없음)

1. Supabase 프로젝트 생성
2. `backend/supabase/schema.sql` 실행
3. `backend/supabase/policies.sql` 실행
4. Project URL + anon key 복사

### 2단계 — 클라이언트 초기화

1. `front/assets/js/config/supabase-config.js` 에 URL/key 입력
2. 각 HTML `<head>` 에 Supabase CDN + config 스크립트 추가
3. `vercel.json` CSP `connect-src` 에 `https://*.supabase.co` 추가

### 3단계 — 인증 흐름

1. `front/views/login.html` 로그인 UI 구현 (이메일/비밀번호 폼)
2. `front/assets/js/view/login.js` — `DayflowAuth.signIn()` 연결
3. 각 화면 진입 시 세션 확인 → 없으면 `/login` 리다이렉트

### 4단계 — 데이터 저장 교체

1. `result.js` / `chat.js` 에서 `DayflowDiaryStore` → `DayflowSupabaseStore` 교체
2. `report.js` 에서 월별 감정 조회를 `getEmotionsByMonth()` 로 교체
3. `advice.js` 에서 최신 일기 조회를 `getLatestDiaryForToday()` 로 교체

---

## 수정 대상 파일

| 파일 | 작업 내용 |
|------|----------|
| `backend/supabase/schema.sql` | (이미 작성) 콘솔 실행만 필요 |
| `backend/supabase/policies.sql` | (이미 작성) 콘솔 실행만 필요 |
| `front/assets/js/config/supabase-config.js` | URL/key 실값 입력 |
| `front/assets/js/agents/authAgent.js` | (이미 작성) CDN 로드 후 동작 |
| `front/assets/js/domain/supabaseStore.js` | (이미 작성) view JS 연결만 필요 |
| `front/views/login.html` | 로그인 폼 UI 구현 |
| `front/assets/js/view/login.js` | signIn/signUp 이벤트 연결 |
| `front/assets/js/view/result.js` | DayflowSupabaseStore 교체 |
| `front/assets/js/view/chat.js` | DayflowSupabaseStore 교체 |
| `front/assets/js/view/report.js` | getEmotionsByMonth 교체 |
| `front/assets/js/view/advice.js` | getLatestDiaryForToday 교체 |
| `vercel.json` | CSP connect-src 에 Supabase 도메인 추가 |

---

## 데이터/상태 기준

- **영속 데이터**: Supabase PostgreSQL (`diaries`, `emotions`, `settings`)
- **세션**: Supabase Auth — `localStorage`에 자동 저장/갱신
- **일시 상태**: `sessionStorage` (화면 플로우 상태 — 기존 유지)

---

## 테스트 체크리스트

### Supabase 세팅

- [ ] Supabase 대시보드 Table Editor에 3개 테이블 확인 (`diaries`, `emotions`, `settings`)
- [ ] RLS 활성화 상태 확인 (각 테이블 → Authentication 탭)
- [ ] 익명 요청으로 직접 쿼리 시 데이터 반환 없음 확인

### 인증

- [ ] 이메일/비밀번호 회원가입 성공
- [ ] 이메일/비밀번호 로그인 성공 → `/main` 리다이렉트
- [ ] 로그아웃 후 보호 페이지 접근 시 `/login` 리다이렉트
- [ ] 페이지 새로고침 후 세션 유지

### 데이터 저장

- [ ] 채팅 완료 후 Supabase `diaries` 테이블에 행 추가 확인
- [ ] `emotions` 테이블에 감정 스냅샷 저장 확인
- [ ] 다른 기기(또는 시크릿 창)에서 로그인 후 동일 데이터 조회 확인
- [ ] 타 사용자 데이터 접근 불가 확인 (RLS 검증)

### CSP

- [ ] 브라우저 콘솔에 CSP 차단 오류 없음

---

## 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| anon key 노출 | RLS 정책 정상 적용 확인으로 대응 |
| CDN 로드 실패 | `DayflowSupabase === null` 시 에러 메시지 표시 |
| 네트워크 오류 시 저장 실패 | 사용자에게 재시도 안내, 저장 실패 토스트 |
| 세션 만료 중 요청 | Supabase JS가 자동 갱신 — 만료 시 `/login` 리다이렉트 |

---

## 완료 기준

- 신규 가입 사용자가 로그인 → 채팅 → 저장 → 리포트 전 흐름을 오류 없이 통과한다.
- Supabase 대시보드에서 저장된 데이터를 직접 확인할 수 있다.
- 다른 기기에서 동일 계정으로 로그인 시 데이터가 동기화된다.
- CSP 오류가 없고 기존 AI 프록시(`/api/chat`)가 정상 동작한다.

---

마지막 업데이트: 2026-04-27  
상태: 1단계(콘솔 세팅) 대기 중 — Supabase 프로젝트 생성 후 2단계 진행
