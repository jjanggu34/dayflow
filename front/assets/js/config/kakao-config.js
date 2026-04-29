/* Kakao 공유 설정
 * 프로덕션: Vercel 환경변수 DAYFLOW_KAKAO_JS_KEY → /env.js 가 window.__ENV__ 에 주입
 * 로컬: DAYFLOW_KAKAO_JS_KEY=... npm run dev (dev-front.mjs 가 동일하게 /env.js 제공)
 * 레포에는 키를 넣지 마세요. */

(function (global) {
  "use strict";

  var env = global.__ENV__ || {};
  var key = String(env.DAYFLOW_KAKAO_JS_KEY || "").trim();
  global.DayflowKakaoConfig = {
    jsKey: key,
    isReady: !!key,
  };
})(typeof window !== "undefined" ? window : this);
