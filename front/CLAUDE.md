# DAYFLOW 프론트엔드 — Claude Code 가이드

## 프로젝트 개요

감정 일기 웹앱. 사용자가 오늘의 감정을 선택하고 AI와 대화하며 감정을 기록한다.

- **스택**: Vanilla JS (jQuery), HTML, CSS — 빌드 도구 없음
- **배포**: Vercel (vercel.json 라우팅)
- **AI**: Anthropic Claude API (chatAgent, analysisAgent)

## 디렉터리 구조

```
front/
├── index.html                 # 진입점 (라우팅 전 랜딩)
├── views/
│   ├── common/                # header, footer, nav, stepbar (공통 컴포넌트)
│   ├── home/                  # 홈 화면
│   ├── chat/                  # 감정선택(emotion), 채팅(chat), 결과(result)
│   ├── advice/                # 조언 화면
│   ├── report/                # 리포트 화면
│   ├── my/                    # 마이페이지
│   └── login.html
├── assets/
│   ├── css/                   # main.css → common, layout, button, form, popup 임포트
│   └── js/
│       ├── view/              # 화면별 JS (emotion.js, chat.js ...)
│       ├── agents/            # chatAgent, analysisAgent, apikeyManager
│       ├── domain/            # diaryFlow, diaryStore (비즈니스 로직)
│       ├── ui/com/            # layout, popup, calendar, input (UI 공통)
│       ├── config/            # db-config
│       └── lib/               # jquery-1.12.4.js
└── docs/
    ├── research.md
    └── plan.md
```

## 네이밍 컨벤션

| 대상 | 표기법 | 예시 |
|------|--------|------|
| HTML `class` | kebab-case | `btn-group`, `text-content`, `bottom-content` |
| HTML `id` (JS 참조) | camelCase | `headerWrap`, `emotionBtnGroup`, `startChatBtn` |
| HTML `data-*` 속성 | kebab-case | `data-emotion-type` |
| JS 변수 · 함수 | camelCase | `emotionType`, `handleClick`, `startChatBtn` |
| JS 클래스 | PascalCase | `DiaryFlow`, `ChatAgent` |
| CSS 파일 | kebab-case | `main.css`, `button.css` |
| JS 파일 (view) | camelCase | `emotion.js`, `diaryFlow.js` |

**규칙 요약**: `id`와 JS 식별자는 camelCase, CSS와 HTML 속성은 kebab-case.

### data-* → JS 접근 패턴

```js
// HTML: data-emotion-type="best"
// JS:   dataset.emotionType  (브라우저가 자동으로 camelCase 변환)
btn.dataset.emotionType  // "best"
```

## HTML 구조 패턴

모든 페이지의 기본 골격:

```html
<div class="wrap">
  <div id="headerWrap">
    <header id="header"></header>   <!-- JS 참조: id (camelCase) -->
  </div>
  <div id="bodyWrap">
    <main>
      <section class="...">         <!-- CSS 전용: class (kebab-case) -->
        ...
      </section>
    </main>
  </div>
</div>
```

- `id`는 JS에서 `getElementById` / `querySelector`로 참조하는 요소에만 붙인다.
- `class`는 CSS 스타일링 전용. JS에서 상태 변경 시에도 class명은 kebab-case 유지.

## 워크플로우 (RPD)

`.cursor/rules/dayflow-rpd-workflow.mdc`와 동일한 원칙을 따른다:

1. **Research** → `docs/research.md` 갱신
2. **Plan** → `docs/plan.md` 갱신, 사용자 승인 대기
3. **Implement** → 승인 후 `plan.md` 순서대로 구현

**승인 전 `views/`, `assets/`, `index.html` 코드 수정 금지.**

## 주의사항

- jQuery `$`를 사용하지만 신규 코드는 Vanilla JS 우선
- `voiceAgent`, `reportAgent`, `adviceAgent`는 명시적 승인 전 구현 금지
- CSS는 `main.css` import 순서 유지 (common → layout → button → form → popup)
