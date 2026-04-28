/* views/login.html */
(function () {
  "use strict";

  var isSignUp = false;

  var emailEl     = document.getElementById("loginEmail");
  var passwordEl  = document.getElementById("loginPassword");
  var submitBtn   = document.getElementById("loginSubmitBtn");
  var toggleBtn   = document.getElementById("loginToggleBtn");
  var errorEl     = document.getElementById("loginError");
  var subtitleEl  = document.getElementById("loginSubtitle");

  function resolvePostLoginUrl() {
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
      sessionStorage.removeItem("dayflow_post_login_redirect");
    } catch (e1) {}
    return origin + path;
  }

  // 이미 로그인된 상태면 메인으로 (오래된 post_login_redirect 는 소비하지 않음)
  DayflowAuth.getCurrentUser().then(function (user) {
    if (user) {
      try {
        var o = window.location.origin || "";
        window.location.replace(o + "/main");
      } catch (e) {
        window.location.replace("/main");
      }
    }
  });

  function setError(msg) {
    if (errorEl) errorEl.textContent = msg || "";
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? "잠시만요..." : (isSignUp ? "회원가입" : "로그인");
  }

  function switchMode() {
    isSignUp = !isSignUp;
    setError("");
    if (isSignUp) {
      if (submitBtn) submitBtn.textContent = "회원가입";
      if (toggleBtn) toggleBtn.textContent = "이미 계정이 있어요 — 로그인";
      if (subtitleEl) subtitleEl.textContent = "새 계정을 만들어요";
      if (passwordEl) passwordEl.setAttribute("autocomplete", "new-password");
    } else {
      if (submitBtn) submitBtn.textContent = "로그인";
      if (toggleBtn) toggleBtn.textContent = "회원가입";
      if (subtitleEl) subtitleEl.textContent = "오늘의 감정을 기록하세요";
      if (passwordEl) passwordEl.setAttribute("autocomplete", "current-password");
    }
  }

  function handleSubmit() {
    if (!emailEl || !passwordEl) return;
    var email    = emailEl.value.trim();
    var password = passwordEl.value;

    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setError("");
    setLoading(true);

    var action = isSignUp
      ? DayflowAuth.signUp(email, password)
      : DayflowAuth.signIn(email, password);

    action
      .then(function () {
        window.location.replace(resolvePostLoginUrl());
      })
      .catch(function (err) {
        var msg = err.message || "오류가 발생했습니다.";
        if (msg.includes("Invalid login credentials")) msg = "이메일 또는 비밀번호가 올바르지 않습니다.";
        if (msg.includes("User already registered"))  msg = "이미 가입된 이메일입니다. 로그인해주세요.";
        if (msg.includes("Password should be"))       msg = "비밀번호는 6자 이상이어야 합니다.";
        setError(msg);
        setLoading(false);
      });
  }

  if (submitBtn) submitBtn.addEventListener("click", handleSubmit);
  if (toggleBtn) toggleBtn.addEventListener("click", switchMode);

  var googleBtn = document.getElementById("loginGoogleBtn");
  if (googleBtn) {
    googleBtn.addEventListener("click", function () {
      setError("");
      DayflowAuth.signInWithGoogle().catch(function (err) {
        setError(err.message || "구글 로그인 중 오류가 발생했습니다.");
      });
    });
  }

  [emailEl, passwordEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleSubmit();
    });
  });
})();
