# DAYFLOW — Supabase 연동 가이드

## 전체 구조

```
현재 데이터 흐름:
브라우저 → IndexedDB(Dexie) [로컬 저장, 앱 삭제시 데이터 손실]

목표 데이터 흐름:
브라우저 → Supabase (PostgreSQL + Auth) [클라우드 저장, 로그인 기반]
         → Vercel /api/chat.js (Claude AI 프록시, 기존 유지)
```

---

## STEP 1 — Supabase 프로젝트 만들기

1. https://supabase.com 접속 → GitHub 계정으로 가입
2. **New project** 클릭
   - Name: `dayflow`
   - Database Password: 안전한 비밀번호 설정 (어딘가 저장해두기)
   - Region: `Northeast Asia (Seoul)` 선택
3. 프로젝트 생성 완료까지 약 1-2분 대기

---

## STEP 2 — 데이터베이스 스키마 만들기

1. 좌측 메뉴 **SQL Editor** 클릭
2. `+ New query` 클릭
3. `backend/supabase/schema.sql` 내용 전체 복사 → 붙여넣기 → **Run** 클릭
4. 같은 방식으로 `backend/supabase/policies.sql` 내용 실행

확인: 좌측 **Table Editor** 에 `diaries`, `emotions`, `settings` 테이블이 보이면 성공

---

## STEP 3 — API 키 복사

1. 좌측 메뉴 **Settings** → **API** 클릭
2. 아래 두 값을 복사해두기:
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon public key**: `eyJhb...` (긴 문자열)

> anon key는 RLS가 켜져 있으면 공개해도 안전합니다 (본인 데이터만 접근 가능)

---

## STEP 4 — 프론트에 Supabase 설정 넣기

`front/assets/js/config/supabase-config.js` 파일에 복사한 값 입력:

```js
var SUPABASE_URL = 'https://xxxx.supabase.co';   // ← 본인 URL
var SUPABASE_KEY = 'eyJhb...';                    // ← 본인 anon key
```

---

## STEP 5 — Auth (로그인) 설정

1. Supabase 대시보드 → **Authentication** → **Providers**
2. **Email** 이 기본 활성화 되어 있음 (이메일/비밀번호 로그인)
3. 옵션: Google 로그인 추가하려면 **Google** 토글 켜고 OAuth Client ID/Secret 입력

---

## STEP 6 — Vercel 환경변수 설정

Vercel Dashboard → 프로젝트 → **Settings** → **Environment Variables** 에 추가:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhb...` |
| `ANTHROPIC_API_KEY` | (기존 유지) |

---

## 파일 역할 정리

| 파일 | 역할 |
|------|------|
| `backend/supabase/schema.sql` | DB 테이블 정의 (Supabase SQL Editor에서 실행) |
| `backend/supabase/policies.sql` | RLS 보안 정책 (schema.sql 다음에 실행) |
| `front/assets/js/config/supabase-config.js` | Supabase URL/Key 설정 |
| `front/assets/js/domain/supabaseStore.js` | diaryStore 대체 — Supabase CRUD |
| `front/assets/js/agents/authAgent.js` | 로그인/로그아웃/세션 관리 |

---

## 작업 순서 체크리스트

- [ ] STEP 1: Supabase 프로젝트 생성
- [ ] STEP 2: schema.sql + policies.sql 실행
- [ ] STEP 3: URL, anon key 복사
- [ ] STEP 4: supabase-config.js 에 키 입력
- [ ] STEP 5: Auth 설정 확인
- [ ] STEP 6: supabaseStore.js 연동 테스트
- [ ] STEP 7: login.html + authAgent.js 로그인 UI 구현
- [ ] STEP 8: 기존 diaryStore.js → supabaseStore.js 로 교체
- [ ] STEP 9: Vercel 환경변수 설정 후 배포
