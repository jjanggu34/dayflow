/* views/advice/advice.html — 포춘쿠키 배너 → fortune_popup.html 모달(iframe) */
(function ($) {
  "use strict";

  var POPUP_PATH = "/views/advice/fortune_popup.html";

  function resolvePopupUrl() {
    if (typeof window.DAYFLOW_FORTUNE_POPUP_URL === "string" && window.DAYFLOW_FORTUNE_POPUP_URL.trim()) {
      return window.DAYFLOW_FORTUNE_POPUP_URL.trim();
    }
    var base = document.querySelector("base");
    if (base && base.href) {
      try {
        return new URL(POPUP_PATH, base.href).href;
      } catch (e) {
        /* fall through */
      }
    }
    return POPUP_PATH;
  }

  function openFortunePopup() {
    var $overlay = $("#fortunePopupOverlay");
    var $frame = $("#fortunePopupFrame");
    if (!$overlay.length || !$frame.length) return;
    $frame.attr("src", resolvePopupUrl());
    $overlay.removeAttr("hidden").attr("aria-hidden", "false");
    $("body").css("overflow", "hidden");
    setTimeout(function () {
      $overlay.find(".advice-fortune-popup__close").trigger("focus");
    }, 100);
  }

  function closeFortunePopup() {
    var $overlay = $("#fortunePopupOverlay");
    var $frame = $("#fortunePopupFrame");
    if (!$overlay.length) return;
    $overlay.attr("hidden", "hidden").attr("aria-hidden", "true");
    $frame.attr("src", "about:blank");
    $("body").css("overflow", "");
  }

  $(function () {
    $("#adviceFortuneBtn").on("click", function (e) {
      e.preventDefault();
      openFortunePopup();
    });

    $("#fortunePopupOverlay .advice-fortune-popup__backdrop").on("click", closeFortunePopup);
    $("#fortunePopupOverlay .advice-fortune-popup__close").on("click", closeFortunePopup);

    $(document).on("keydown", function (e) {
      if (e.key !== "Escape") return;
      var el = document.getElementById("fortunePopupOverlay");
      if (el && !el.hasAttribute("hidden")) closeFortunePopup();
    });
  });
})(jQuery);
