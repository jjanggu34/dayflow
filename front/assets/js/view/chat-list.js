/* views/my/chat-list.html — 저장된 일기 목록 → /chat 보기 전용 */
(function () {
  "use strict";

  var SCORE_BY_EMOTION = { best: 92, good: 72, normal: 58, bad: 42, worst: 28 };

  function emotionScore(type) {
    var t = type || "good";
    return Object.prototype.hasOwnProperty.call(SCORE_BY_EMOTION, t) ? SCORE_BY_EMOTION[t] : 58;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function previewText(row) {
    var sum = (row.summary && String(row.summary).trim()) || "";
    if (sum) return sum.length > 120 ? sum.slice(0, 120) + "…" : sum;
    var c = (row.content && String(row.content).trim()) || "";
    if (!c) return "요약 없음";
    return c.length > 120 ? c.slice(0, 120) + "…" : c;
  }

  function renderList(rows) {
    var ul = document.getElementById("chatListRoot");
    if (!ul) return;
    ul.innerHTML = "";
    if (!rows || !rows.length) {
      var li0 = document.createElement("li");
      li0.className = "card-list__empty";
      li0.innerHTML = "<p class=\"card-list__content\">아직 저장된 감정 기록이 없어요.</p>";
      ul.appendChild(li0);
      return;
    }
    rows.forEach(function (row) {
      var id = row.id;
      var date = row.date || "";
      var emo = row.emotion && /^(best|good|normal|bad|worst)$/.test(row.emotion) ? row.emotion : "good";
      if (!id || !date) return;
      var li = document.createElement("li");
      li.setAttribute("data-diary-id", String(id));
      li.setAttribute("data-diary-date", date);
      li.setAttribute("data-diary-emotion", emo);
      li.setAttribute("role", "button");
      li.setAttribute("tabindex", "0");
      li.innerHTML =
        '<p class="card-list__date">' +
        escapeHtml(date) +
        "</p>" +
        '<p class="card-list__content">' +
        escapeHtml(previewText(row)) +
        "</p>" +
        '<p class="card-list__score">' +
        escapeHtml(String(emotionScore(emo))) +
        "</p>";
      ul.appendChild(li);
    });
  }

  function sameOriginHref(path) {
    try {
      return new URL(path, window.location.origin + "/").href;
    } catch (e) {
      return path;
    }
  }

  function openChatForLi(li) {
    if (!li || !li.getAttribute) return;
    var id = (li.getAttribute("data-diary-id") || "").trim();
    var emo = (li.getAttribute("data-diary-emotion") || "good").trim();
    if (!/^\d+$/.test(id)) return;
    try {
      sessionStorage.setItem("dayflow_chat_history_diary_id", id);
      if (emo && /^(best|good|normal|bad|worst)$/.test(emo)) {
        sessionStorage.setItem("dayflow_chat_history_emotion", emo);
      } else {
        sessionStorage.removeItem("dayflow_chat_history_emotion");
      }
    } catch (e) {}
    window.location.href = sameOriginHref("/chat");
  }

  function bindList() {
    var ul = document.getElementById("chatListRoot");
    if (!ul) return;
    ul.addEventListener("click", function (ev) {
      var li = ev.target && ev.target.closest ? ev.target.closest("li[data-diary-id]") : null;
      if (!li) return;
      openChatForLi(li);
    });
    ul.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      var li = ev.target && ev.target.closest ? ev.target.closest("li[data-diary-id]") : null;
      if (!li) return;
      ev.preventDefault();
      openChatForLi(li);
    });
  }

  function boot() {
    bindList();
    var back = document.getElementById("chatBackBtn");
    if (back) {
      back.addEventListener("click", function () {
        if (window.history.length > 1) window.history.back();
        else window.location.href = sameOriginHref("/main");
      });
    }

    if (!window.DayflowAuth || !window.DayflowSupabaseStore) {
      renderList([]);
      return;
    }

    DayflowAuth.getCurrentUser().then(function (user) {
      if (!user) {
        try {
          sessionStorage.setItem("dayflow_post_login_redirect", "/my/chat-list");
        } catch (e0) {}
        window.location.href = sameOriginHref("/login");
        return;
      }
      if (typeof DayflowSupabaseStore.getRecentDiaries !== "function") {
        renderList([]);
        return;
      }
      return DayflowSupabaseStore.getRecentDiaries(80).then(renderList);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
