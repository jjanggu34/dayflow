/* Supabase Auth — 로그인/로그아웃/세션 관리
   DayflowSupabase (supabase-config.js) 가 먼저 로드되어야 합니다 */
(function (global) {
  "use strict";

  function getClient() {
    return global.DayflowSupabase;
  }

  /** 현재 로그인 사용자 반환 (없으면 null) */
  function getCurrentUser() {
    var client = getClient();
    if (!client) return Promise.resolve(null);
    return client.auth.getUser().then(function (res) {
      return res.data && res.data.user ? res.data.user : null;
    });
  }

  /** 이메일/비밀번호 로그인 */
  function signIn(email, password) {
    var client = getClient();
    if (!client) return Promise.reject(new Error("supabase_not_initialized"));
    return client.auth.signInWithPassword({ email: email, password: password })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data.user;
      });
  }

  /** 이메일/비밀번호 회원가입 */
  function signUp(email, password) {
    var client = getClient();
    if (!client) return Promise.reject(new Error("supabase_not_initialized"));
    return client.auth.signUp({ email: email, password: password })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data.user;
      });
  }

  /** 로그인 후 돌아갈 경로(같은 origin 내). chat-list 등에서 sessionStorage 로 지정 */
  function resolveOAuthRedirectTo() {
    var origin = "";
    try {
      origin = window.location.origin || "";
    } catch (e0) {
      origin = "";
    }
    var path = "/main";
    try {
      var pr = sessionStorage.getItem("dayflow_post_login_redirect");
      if (pr && pr.charAt(0) === "/" && pr.indexOf("//") === -1 && !/^[a-z]+:/i.test(pr)) {
        path = pr;
      }
    } catch (e1) {}
    return origin + path;
  }

  /** 구글 OAuth 로그인 */
  function signInWithGoogle() {
    var client = getClient();
    if (!client) return Promise.reject(new Error("supabase_not_initialized"));
    return client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: resolveOAuthRedirectTo() },
    }).then(function (res) {
      if (res.error) throw res.error;
    });
  }

  /** 로그아웃 */
  function signOut() {
    var client = getClient();
    if (!client) return Promise.resolve();
    return client.auth.signOut().then(function (res) {
      if (res.error) throw res.error;
    });
  }

  /**
   * 인증 상태 변경 구독
   * @param {function} callback (event, session) => void
   */
  function onAuthStateChange(callback) {
    var client = getClient();
    if (!client) return;
    client.auth.onAuthStateChange(callback);
  }

  global.DayflowAuth = {
    getCurrentUser: getCurrentUser,
    signIn: signIn,
    signUp: signUp,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    onAuthStateChange: onAuthStateChange,
  };

})(typeof window !== "undefined" ? window : this);
