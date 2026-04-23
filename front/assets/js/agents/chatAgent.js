/* Claude Messages API 호출 — URL은 프록시/직접 전환 (CORS 회피) */
(function (global) {
  "use strict";

  /**
   * 기본 모델 — Claude Haiku 4.5 (공식 alias).
   * 예전 claude-3-5-haiku-20241022 는 API에서 404/미제공일 수 있음.
   * 교체: window.DAYFLOW_ANTHROPIC_MODEL = "claude-sonnet-4-6" 등
   */
  var DEFAULT_MODEL = "claude-haiku-4-5";
  var DEV_PROXY = "http://127.0.0.1:8787/v1/messages";
  var DIRECT = "https://api.anthropic.com/v1/messages";
  var VERCEL_PROXY = "/api/chat";

  function getModel() {
    if (typeof window !== "undefined" && window.DAYFLOW_ANTHROPIC_MODEL) {
      return String(window.DAYFLOW_ANTHROPIC_MODEL).trim();
    }
    return DEFAULT_MODEL;
  }

  /**
   * window.DAYFLOW_ANTHROPIC_URL — 백엔드/프록시 전체 URL
   * window.DAYFLOW_USE_DIRECT_ANTHROPIC — api.anthropic.com 직접(브라우저에서는 대부분 CORS 실패)
   * 로컬호스트가 아니면 /api/chat(Vercel 서버리스) 사용, 로컬이면 8787 프록시 사용
   */
  function getMessagesUrl() {
    if (typeof window === "undefined") return DEV_PROXY;
    if (window.DAYFLOW_ANTHROPIC_URL) return window.DAYFLOW_ANTHROPIC_URL;
    if (window.DAYFLOW_USE_DIRECT_ANTHROPIC) return DIRECT;
    var host = window.location.hostname;
    if (host !== "127.0.0.1" && host !== "localhost") return VERCEL_PROXY;
    return DEV_PROXY;
  }

  function isServerProxy(url) {
    return url === VERCEL_PROXY || (url.charAt(0) === "/" && url.indexOf("//") !== 0);
  }

  function extractAnthropicErrorMessage(data) {
    if (!data || typeof data !== "object") return "";
    if (typeof data.message === "string" && data.message) return data.message;
    if (data.error) {
      if (typeof data.error === "string") return data.error;
      if (data.error.message) return String(data.error.message);
      if (data.error.type && data.error.message) return String(data.error.message);
    }
    return "";
  }

  /**
   * @param {Object} opts
   * @param {string} opts.apiKey
   * @param {string} opts.system
   * @param {Array<{role:string,content:string}>} opts.messages
   * @returns {Promise<string>} assistant 텍스트
   */
  function sendMessages(opts) {
    var url = getMessagesUrl();
    var usingServerProxy = isServerProxy(url);
    var key = (opts && opts.apiKey) || "";

    if (!usingServerProxy && !String(key).trim()) {
      return Promise.reject(new Error("no_api_key"));
    }

    var model = getModel();
    var headers = { "Content-Type": "application/json" };
    if (!usingServerProxy) {
      headers["anthropic-version"] = "2023-06-01";
      headers["x-api-key"] = String(key).trim();
    }

    return fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        model: model,
        max_tokens: 1024,
        system: opts.system,
        messages: opts.messages,
      }),
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (parseErr) {
            var pe = new Error(
              "서버 응답이 JSON이 아니에요(프록시/연결 문제일 수 있음). 앞부분: " + text.replace(/\s+/g, " ").slice(0, 120)
            );
            pe.status = res.status;
            pe.code = "bad_json";
            throw pe;
          }
        } else {
          data = {};
        }

        if (!res.ok) {
          var apiMsg = extractAnthropicErrorMessage(data) || res.statusText || "요청 실패";
          var err = new Error(apiMsg);
          err.status = res.status;
          err.body = data;
          throw err;
        }

        if (data.content && data.content[0] && data.content[0].text) {
          return data.content[0].text;
        }

        var emptyErr = new Error("empty response — 응답에 텍스트가 없어요.");
        emptyErr.status = res.status;
        throw emptyErr;
      });
    });
  }

  global.DayflowChatAgent = {
    DEFAULT_MODEL: DEFAULT_MODEL,
    getModel: getModel,
    getMessagesUrl: getMessagesUrl,
    isServerProxy: isServerProxy,
    sendMessages: sendMessages,
  };
})(typeof window !== "undefined" ? window : this);
