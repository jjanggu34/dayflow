# DAYFLOW — 백엔드 구조 분석 및 운영 기준서

## 문서 목적

- 백엔드(Supabase + Vercel 서버리스) 전체 구조를 파악하고, 신규 작업자가 동일한 방식으로 작업할 수 있도록 정리한 기준서다.
- 대상 범위: `backend/`, `api/`, `vercel.json` (백엔드/인프라 관련 전체)
- 프론트 기준서: `front/docs/research.md`

---

## 전체 아키텍처 한 줄 요약

브라우저 → Supabase JS 클라이언트 → Supabase (Auth + PostgreSQL)  
브라우저 → Vercel `/api/chat.js` → Anthropic Claude API (AI 프록시, 서버사이드 키 보호)

---

## 백엔드 구조와 역할

| 경로 | 역할 |
|------|------|
| `backend/supabase/schema.sql` | DB 테이블 정의 — Supabase SQL Editor에서 1회 실행 |
| `backend/supabase/policies.sql` | RLS 보안 정책 — schema.sql 실행 후 실행 |
| `backend/docs/research.md` | 이 문서 |
| `backend/docs/plan.md` | 백엔드 작업 계획 |
| `api/chat.js` | Claude AI 프록시 (기존 유지, Vercel 서버리스) |
| `vercel.json` | 라우팅 + CSP 헤더 (Supabase 도메인 추가 필요) |

---

## Supabase 선택 근거

| 항목 | 기존 (Dexie/IndexedDB) | Supabase |
|------|----------------------|----------|
| 저장 위치 | 브라우저 로컬 | 클라우드 PostgreSQL |
| 기기 간 동기화 | 불가 | 가능 |
| 인증 | 없음 | 내장 (Email, OAuth) |
| 별도 서버 | 불필요 | 불필요 (BaaS) |
| 비용 | 무료 | 무료 tier 충분 (500MB DB, 50K MAU) |

Vercel 서버리스 함수 없이 **프론트에서 Supabase JS 클라이언트를 직접 호출**하는 구조를 채택한다.  
Claude AI만 서버사이드 키가 필요하므로 `/api/chat.js` 프록시는 유지한다.

---

## 데이터베이스 스키마

### 설계 원칙

- 기존 Dexie 스키마(`diaries`, `emotions`, `settings`)와 **컬럼 의미 동일** — 프론트 교체 비용 최소화
- 모든 테이블에 `user_id UUID` 추가 — 멀티유저 지원 및 RLS 기준 컬럼
- 컬럼명은 snake_case (PostgreSQL 관례)

### 테이블 정의

**diaries** (일기)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | 자동 증가 |
| user_id | UUID FK | auth.users 참조 |
| date | DATE | 일기 날짜 (YYYY-MM-DD) |
| emotion | TEXT | best / good / normal / bad / worst |
| content | TEXT | 채팅 원문 전체 |
| summary | TEXT | 요약본 (최대 2000자) |
| image_base64 | TEXT | 감정 이미지 (nullable) |
| created_at | TIMESTAMPTZ | 서버 시각 기본값 |

**emotions** (감정 스냅샷 — 리포트용)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| user_id | UUID FK | |
| date | DATE | |
| type | TEXT | 감정 타입 |
| score | INTEGER | 28 / 42 / 58 / 72 / 92 |
| created_at | TIMESTAMPTZ | |

**settings** (앱 설정 키-값)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| user_id | UUID FK | |
| key | TEXT | 설정 키 |
| value | JSONB | 임의 값 |
| (user_id, key) | UNIQUE | 유저별 키 중복 방지 |

---

## 인증(Auth) 설계

- **Supabase Auth** 내장 기능 사용 (별도 인증 서버 불필요)
- 1단계: 이메일/비밀번호 로그인 (`signInWithPassword`)
- 2단계 (선택): Google OAuth 추가 가능

**세션 관리 방식**

- Supabase JS가 `localStorage`에 세션 토큰 자동 저장/갱신
- 페이지 로드 시 `DayflowAuth.getCurrentUser()` 로 세션 확인 → 없으면 `/login` 리다이렉트

**프론트 연동 파일**

| 파일 | 역할 |
|------|------|
| `front/assets/js/config/supabase-config.js` | 클라이언트 초기화 (URL + anon key) |
| `front/assets/js/agents/authAgent.js` | signIn / signUp / signOut / onAuthStateChange |
| `front/assets/js/domain/supabaseStore.js` | diaryStore 대체 CRUD |

---

## Row Level Security (RLS) 정책

- **모든 테이블 RLS 활성화** — DB에 직접 접근해도 본인 데이터만 읽기/쓰기 가능
- 정책 기준: `auth.uid() = user_id`
- anon key가 클라이언트에 노출되어도 안전한 이유: RLS가 쿼리 레벨에서 차단

---

## Vercel 환경변수

| 키 | 값 | 용도 |
|----|-----|------|
| `ANTHROPIC_API_KEY` | 기존 유지 | Claude AI 프록시 |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | 서버사이드 참조 (필요 시) |
| `SUPABASE_ANON_KEY` | `eyJhb...` | 서버사이드 참조 (필요 시) |

> 프론트에서 Supabase JS 클라이언트를 직접 호출하는 현재 구조에서는 `SUPABASE_URL`/`SUPABASE_ANON_KEY`를 Vercel 환경변수로 관리할 필요는 없다. `supabase-config.js` 에 직접 하드코딩해도 RLS로 보호된다.

---

## vercel.json 수정 필요 사항

CSP `connect-src` 에 Supabase 도메인 추가 필요:

```
connect-src 'self' https://*.supabase.co https://...
```

---

## 개발 루틴 (RPD)

1. **Research** → `backend/docs/research.md` 갱신
2. **Plan** → `backend/docs/plan.md` 갱신, 승인 대기
3. **Implement** → 승인 후 SQL / JS 파일 수정

**승인 전 `schema.sql`, `policies.sql`, `supabase-config.js`, `supabaseStore.js` 수정 금지**

---

## 리스크 및 주의사항

1. **anon key 노출**: RLS가 켜져 있으면 안전하나, `policies.sql` 누락 시 전체 데이터 노출 위험
2. **image_base64 용량**: 이미지 base64는 PostgreSQL TEXT에 저장되므로 행 크기 증가 — 추후 Supabase Storage 이관 고려
3. **날짜 타임존**: DB의 `created_at`은 UTC 기준, 프론트 `toYmd()`는 로컬 날짜 기준 — `date` 컬럼은 로컬 날짜로 저장하므로 일치
4. **오프라인 동작**: Supabase 연동 시 오프라인 상태에서 저장 불가 — 필요 시 IndexedDB를 임시 큐로 병행 운영 고려
5. **무료 tier 제한**: Supabase 무료 플랜은 프로젝트 1주일 비활성 시 일시 정지 — 초기 개발 중 주의

---

## 추천 운영 원칙

- SQL 변경(컬럼 추가/삭제)은 반드시 `schema.sql` 에 반영하고, 대응하는 `policies.sql` 도 함께 점검한다.
- `supabaseStore.js` 의 공개 API는 `diaryStore.js` 와 동일하게 유지한다 — 프론트 view JS 교체 비용 최소화.
- Supabase 대시보드에서 직접 데이터 조작 시 RLS를 bypass하게 되므로, 운영 데이터는 대시보드 직접 수정을 지양한다.

---

마지막 업데이트: 2026-04-27  
기준: Supabase 연동 초기 설계 반영
