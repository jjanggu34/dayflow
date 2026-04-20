/* Anthropic API 키 — ① window.DAYFLOW_ANTHROPIC_API_KEY(페이지에 박기) ② localStorage(⚙ 입력) */
(function (global) {
  "use strict";

  var STORAGE_KEY = "dayflow_anthropic_key";

  /** HTML에서 <script>window.DAYFLOW_ANTHROPIC_API_KEY="sk-ant-…"</script> 로 넣으면 ⚙ 프롬프트 없이 사용 */
  function getEmbedded() {
    try {
      if (!global || global.DAYFLOW_ANTHROPIC_API_KEY == null) return "";
      return String(global.DAYFLOW_ANTHROPIC_API_KEY).trim();
    } catch (e) {
      return "";
    }
  }

  function usesEmbeddedKey() {
    return !!getEmbedded();
  }

  function get() {
    var emb = getEmbedded();
    if (emb) return emb;
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function set(k) {
    if (getEmbedded()) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(k || "").trim());
    } catch (e) {}
  }

  function has() {
    return !!get().trim();
  }

  global.DayflowApiKey = {
    STORAGE_KEY: STORAGE_KEY,
    getEmbedded: getEmbedded,
    usesEmbeddedKey: usesEmbeddedKey,
    get: get,
    set: set,
    has: has,
  };
})(typeof window !== "undefined" ? window : this);
