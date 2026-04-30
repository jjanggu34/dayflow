/* views/login/join-step*.html — 닉네임~완료 스텝 */
(function () {
  "use strict";

  var STORAGE_KEY = "dayflow_join_profile_v1";
  /** main 등 화면 인사말에 쓰기 위해 브라우저에 유지 (구글 표시 이름보다 우선) */
  var DISPLAY_NICKNAME_KEY = "dayflow_display_nickname";
  /** Supabase settings 키 (JSONB value) */
  var SETTING_DISPLAY_NICK = "display_nickname";
  var SETTING_JOIN_PROFILE = "join_profile";
  var SETTING_ONBOARDING_DONE = "onboarding_complete";

  var g = typeof window !== "undefined" ? window : globalThis;

  function trimNick(s) {
    var t = String(s || "").trim();
    return t ? t.slice(0, 40) : "";
  }

  /** 로그인된 경우에만 settings 테이블에 동기화 */
  function persistDisplayNicknameToSupabase(nick) {
    var v = trimNick(nick);
    if (!v) return Promise.resolve();
    var auth = g.DayflowAuth;
    var store = g.DayflowSupabaseStore;
    if (!auth || !store || typeof store.setSetting !== "function") return Promise.resolve();
    return auth.getCurrentUser().then(function (user) {
      if (!user) return;
      return store.setSetting(SETTING_DISPLAY_NICK, v);
    }).catch(function () {});
  }

  function persistJoinProfileToSupabase(data) {
    var auth = g.DayflowAuth;
    var store = g.DayflowSupabaseStore;
    if (!auth || !store || typeof store.setSetting !== "function") return Promise.resolve();
    return auth.getCurrentUser().then(function (user) {
      if (!user) return;
      var d = data || {};
      var nick = trimNick(d.nickname);
      var tasks = [];
      if (nick) tasks.push(store.setSetting(SETTING_DISPLAY_NICK, nick));
      tasks.push(
        store.setSetting(SETTING_JOIN_PROFILE, {
          nickname: nick || null,
          ageRange: d.ageRange ? String(d.ageRange) : null,
          gender: d.gender ? String(d.gender) : null,
        })
      );
      tasks.push(store.setSetting(SETTING_ONBOARDING_DONE, true));
      return Promise.all(tasks);
    }).catch(function () {});
  }

  function load() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function save(patch) {
    var o = load();
    Object.assign(o, patch);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(o));
    } catch (e) {}
    if (patch && patch.nickname && String(patch.nickname).trim()) {
      try {
        localStorage.setItem(DISPLAY_NICKNAME_KEY, String(patch.nickname).trim().slice(0, 40));
      } catch (e2) {}
      persistDisplayNicknameToSupabase(patch.nickname);
    }
  }

  function setJoinNicknameError(msg) {
    var el = document.getElementById("joinNicknameError");
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.hidden = false;
    } else {
      el.textContent = "";
      el.hidden = true;
    }
  }

  var nickInput = document.getElementById("joinNickname");
  var step01Next = document.getElementById("joinStep01Next");
  if (nickInput && step01Next) {
    function syncStep01() {
      step01Next.disabled = !nickInput.value.trim();
    }
    nickInput.addEventListener("input", function () {
      setJoinNicknameError("");
      syncStep01();
    });
    syncStep01();
    step01Next.addEventListener("click", function () {
      var v = nickInput.value.trim();
      if (!v) return;
      setJoinNicknameError("");
      var store = g.DayflowSupabaseStore;
      function goStep02() {
        save({ nickname: v });
        window.location.href = "/views/login/join-step02.html";
      }
      if (!store || typeof store.isDisplayNicknameAvailable !== "function") {
        goStep02();
        return;
      }
      step01Next.disabled = true;
      store
        .isDisplayNicknameAvailable(v)
        .then(function (ok) {
          step01Next.disabled = !nickInput.value.trim();
          if (!ok) {
            setJoinNicknameError("이미 사용 중인 닉네임이에요.");
            return;
          }
          goStep02();
        })
        .catch(function () {
          step01Next.disabled = !nickInput.value.trim();
          goStep02();
        });
    });
  }

  var step02Next = document.getElementById("joinStep02Next");
  if (step02Next) {
    step02Next.addEventListener("click", function () {
      var checked = document.querySelector('input[name="joinAge"]:checked');
      if (!checked) return;
      save({ ageRange: checked.value });
      window.location.href = "/views/login/join-step03.html";
    });
  }

  var step03Next = document.getElementById("joinStep03Next");
  if (step03Next) {
    step03Next.addEventListener("click", function () {
      var checked = document.querySelector('input[name="joinGender"]:checked');
      if (!checked) return;
      save({ gender: checked.value });
      window.location.href = "/views/login/join-step04.html";
    });
  }

  var welcomeNameEl = document.getElementById("joinWelcomeName");
  if (welcomeNameEl) {
    var data = load();
    if (data.nickname) welcomeNameEl.textContent = data.nickname;
  }

  var step04Start = document.getElementById("joinStep04Start");
  if (step04Start) {
    step04Start.addEventListener("click", function () {
      var data = load();
      persistJoinProfileToSupabase(data).finally(function () {
        window.location.href = "/main";
      });
    });
  }

  function isProfileCompleteOnServer(ob, jp) {
    if (ob === true || ob === "true") return true;
    if (jp && typeof jp === "object") {
      if (
        trimNick(jp.nickname) &&
        String(jp.ageRange || "").trim() &&
        String(jp.gender || "").trim()
      ) {
        return true;
      }
    }
    return false;
  }

  /** 이미 온보딩 끝난 계정이 스텝 URL로 들어오면 메인으로 */
  function redirectIfOnboardingAlreadyDone() {
    var auth = g.DayflowAuth;
    var store = g.DayflowSupabaseStore;
    if (!auth || !store || typeof store.getSetting !== "function") return;
    auth
      .getCurrentUser()
      .then(function (user) {
        if (!user) return;
        return Promise.all([
          store.getSetting(SETTING_ONBOARDING_DONE),
          store.getSetting(SETTING_JOIN_PROFILE),
        ]).then(function (arr) {
          if (isProfileCompleteOnServer(arr[0], arr[1])) {
            window.location.replace("/main");
          }
        });
      })
      .catch(function () {});
  }
  redirectIfOnboardingAlreadyDone();
})();
