# DAYFLOW — plan.md (현행 작업 계획)

## 승인 게이트

- 작업 순서는 `research -> plan -> implement`를 따른다.
- 구현 전에는 `docs/research.md`와 `docs/plan.md`를 최신화하고 사용자 승인을 받는다.
- 승인 전에는 앱 코드(`views`, `assets`, `index.html`, `vercel.json`) 수정 없이 문서만 갱신한다.

## 현재 목표

- 최신 코드베이스 기준으로 문서를 동기화한다.
- 다음 구현 작업이 바로 가능하도록 우선순위/범위/검증 기준을 재정의한다.
- `front/`를 기준 앱 소스로 고정하고, 관련 리스크를 명확히 관리한다.

## 범위

### 포함

- 문서 정합성 유지 (`docs/research.md`, `docs/plan.md`)
- 기능 작업 시 우선 적용 대상
  - 조언 포춘쿠키 노출 규칙 개선
  - 마지막 일기 기반 AI 조언 개인화
  - 조언 본문 6줄 제한 UI 보장

### 제외

- 신규 인프라 도입(Supabase, 인증, 결제, 푸시)
- 대규모 아키텍처 전환
- 추후 에이전트(`voiceAgent`, `reportAgent`, `adviceAgent`) 신규 추가

## 다음 구현 우선순위

1. **조언 포춘쿠키 노출 규칙**
   - 자동 오픈 제거
   - 버튼 클릭 시만 오픈
   - 당일 1회 제한, 익일 재오픈 허용
2. **마지막 일기 기반 AI 조언**
   - 최신 `diaries` 1건 조회
   - 조언 날짜/본문 동적 반영
   - 실패 시 폴백 메시지 유지
3. **조언 본문 표시 안정화**
   - 모바일 기준 6줄 제한(clamp)
   - 긴 응답/줄바꿈/빈값 예외 처리

## 수정 대상 파일 (예상)

- `front/assets/js/view/advice.js`
- `front/assets/css/advice.css`
- `front/views/advice/advice.html` (필요 시)
- 연동 확인: `front/assets/js/agents/chatAgent.js`, `front/assets/js/config/db-config.js`

## 데이터/상태 기준

- 영속 데이터: IndexedDB (`DayflowDB.diaries`, `DayflowDB.emotions`, `DayflowDB.settings`)
- 일시 상태: `sessionStorage` (화면 플로우 상태)
- 키 저장: `localStorage` (`apikeyManager` 관리 범위)

## 테스트 체크리스트

- [ ] 조언 첫 진입 시 포춘쿠키 팝업 자동 노출 없음
- [ ] 포춘쿠키 버튼 클릭 시 팝업 열림
- [ ] 같은 날 재클릭 시 재오픈 차단
- [ ] 익일(날짜 변경 후) 재클릭 시 다시 오픈 가능
- [ ] 최신 일기 기준 날짜/조언 본문 반영
- [ ] API 실패/키 없음 상황에서 폴백 메시지 정상 표시
- [ ] 조언 본문이 모바일에서 최대 6줄 이내로 표시

## 리스크 및 대응

- **CORS/API 실패**: 사용자 안내 + 폴백 문구 + 재시도 흐름 유지
- **저장값 불일치**: 날짜 비교 기준을 로컬 날짜 단위로 통일
- **직접 URL 진입 예외**: 없는 상태값에서 안전한 기본 분기 유지

## 완료 기준

- `research.md`와 `plan.md` 간 설명이 상충하지 않는다.
- 다음 구현 작업(조언 기능 3건)을 바로 시작 가능한 수준으로 범위/검증 항목이 확정된다.
- 문서만으로 신규 작업자가 작업 흐름을 이해할 수 있다.

---

마지막 업데이트: 2026-04-27  
상태: 문서 정합화 완료, 구현 승인 대기
