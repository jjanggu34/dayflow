/**
 * views/common/footer.html 을 fetch 해 삽입 (정적 호스팅용 경량 인클루드)
 * 배치: .wrap.has-tab-footer 안에서 #bodyWrap 다음에
 *   <div id="footerIncludeHost" data-app-tab="home|report|advice"></div>
 * data-app-tab 생략 시 location.pathname 으로 추정
 */
(function () {
  "use strict";

  var HOST_ID = "footerIncludeHost";
  var PARTIAL_URL = "/views/common/footer.html";

  function tabFromPath() {
    try {
      var p = (location.pathname || "").replace(/\/+$/, "") || "/";
      if (p === "/main" || /\/main$/i.test(p)) return "home";
      if (p.indexOf("/report") !== -1) return "report";
      if (p.indexOf("/advice") !== -1) return "advice";
    } catch (e) {}
    return "";
  }

  function markCurrent(footerEl, tab) {
    var map = { home: ".btn-home", report: ".btn-report", advice: ".btn-advice" };
    var q = map[tab];
    if (!q) return;
    var a = footerEl.querySelector(q);
    if (a) a.setAttribute("aria-current", "page");
  }

  function run() {
    var host = document.getElementById(HOST_ID);
    if (!host) return;
    var tab = (host.getAttribute("data-app-tab") || "").trim() || tabFromPath();

    fetch(PARTIAL_URL, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then(function (html) {
        var trimmed = String(html || "").trim();
        if (!trimmed) return;
        var wrap = document.createElement("div");
        wrap.innerHTML = trimmed;
        var footer = wrap.querySelector("#footerWrap");
        if (!footer || !host.parentNode) return;
        markCurrent(footer, tab);
        host.parentNode.replaceChild(footer, host);
      })
      .catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
