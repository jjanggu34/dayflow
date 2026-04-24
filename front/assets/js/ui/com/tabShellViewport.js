/**
 * .wrap.has-tab-footer: Android 등에서 innerHeight / visualViewport가 늦게 확정되거나
 * 100dvh가 커지면서 푸터가 시스템 내비에 겹치는 경우 보정.
 * CSS는 min(100dvh, 100svh)로 기본 방어, 여기서는 "보이는 높이 < inner"일 때만 px로 덮어씀.
 */
(function () {
  "use strict";

  function hasTabShell() {
    return !!document.querySelector(".wrap.has-tab-footer");
  }

  function apply() {
    if (!hasTabShell()) return;
    var inner = window.innerHeight;
    var client = document.documentElement.clientHeight || inner;
    var vv = window.visualViewport;
    if (vv && vv.height > 0) {
      var vh = Math.round(vv.height);
      if (vh < inner - 2) {
        document.documentElement.style.setProperty("--app-tab-shell-height", vh + "px");
        return;
      }
    }
    if (client > 0 && client < inner - 2) {
      document.documentElement.style.setProperty("--app-tab-shell-height", client + "px");
      return;
    }
    document.documentElement.style.removeProperty("--app-tab-shell-height");
  }

  function schedule() {
    apply();
    requestAnimationFrame(apply);
    requestAnimationFrame(function () {
      requestAnimationFrame(apply);
    });
  }

  window.addEventListener("resize", apply, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", apply, { passive: true });
    window.visualViewport.addEventListener("scroll", apply, { passive: true });
  }

  window.addEventListener("orientationchange", function () {
    document.documentElement.style.removeProperty("--app-tab-shell-height");
    setTimeout(schedule, 120);
    setTimeout(schedule, 380);
  });

  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) schedule();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule);
  } else {
    schedule();
  }

  [40, 120, 280, 520].forEach(function (ms) {
    setTimeout(apply, ms);
  });
})();
