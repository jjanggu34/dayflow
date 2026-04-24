/**
 * 감정 일기 없을 때 CTA 블록 — #emptyDiaryCtaHost 가 있으면 주입 (report / advice 공통)
 * 본문은 이 파일 한곳만 수정하면 됩니다.
 */
(function () {
  "use strict";

  var HOST_ID = "emptyDiaryCtaHost";

  var INNER =
    '<div class="text-content">' +
    '<div class="text-group">' +
    "<p>" +
    "<em>당신의 하루를 들려주길 <br />기다리고 있어요!</em>" +
    " 작은 기록이 모여 당신의 마음 지도가 완성돼요." +
    "</p>" +
    "</div>" +
    '<div class="btn-content">' +
    '<button type="button" class="btn-sub" data-empty-diary-cta>일기 쓰러가기</button>' +
    "</div>" +
    "</div>";

  function bind(host) {
    if (!host || host.getAttribute("data-empty-cta-bound") === "1") return;
    host.setAttribute("data-empty-cta-bound", "1");
    host.addEventListener("click", function (e) {
      if (e.target.closest("[data-empty-diary-cta]")) {
        window.location.href = "/chat/emotion";
      }
    });
  }

  function run() {
    var host = document.getElementById(HOST_ID);
    if (!host || host.getAttribute("data-filled") === "1") return;
    host.innerHTML = INNER;
    host.setAttribute("data-filled", "1");
    bind(host);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
