/* Supabase 프로젝트 설정
   backend/README.md STEP 3에서 복사한 값을 여기에 입력하세요 */

var SUPABASE_URL = 'https://dtjfypynfvvakgarhalt.supabase.co';
var SUPABASE_KEY = 'sb_publishable_u8_x_kcV-9dg8OrD9aJLPg_mQOUZgNM';

(function (global) {
  "use strict";

  if (!global.supabase) {
    console.warn("[Supabase] supabase-js 라이브러리가 로드되지 않았습니다. HTML에 CDN 스크립트를 추가하세요.");
    global.DayflowSupabase = null;
    return;
  }

  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    console.warn("[Supabase] supabase-config.js에 실제 URL과 KEY를 입력하세요.");
    global.DayflowSupabase = null;
    return;
  }

  global.DayflowSupabase = global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

})(typeof window !== "undefined" ? window : this);
