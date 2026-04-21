"use strict";

/* views/advice/advice.html — 포춘쿠키 배너 → fortune_popup.html 모달(iframe) */
(function ($) {
  "use strict";

  var POPUP_PATH = "/views/advice/fortune_popup.html";
  var FORTUNE_DB_NAME = "dayflowDB";
  var FORTUNE_STORE_NAME = "fortuneCookies";
  var FORTUNE_KEY = "latest";
  var FORTUNE_MESSAGE_TYPE = "dayflow:fortune-selected";
  var FORTUNE_CLOSE_TYPE = "dayflow:fortune-close";
  var FORTUNE_AUTO_OPEN_KEY = "dayflow:fortune-auto-open-date";
  var hasAutoOpened = false;
  var latestFortuneText = "";

  function getTodayKey() {
    var now = new Date();
    var year = String(now.getFullYear());
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var date = String(now.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + date;
  }

  function canAutoOpenToday() {
    try {
      return window.localStorage.getItem(FORTUNE_AUTO_OPEN_KEY) !== getTodayKey();
    } catch (e) {
      return true;
    }
  }

  function markAutoOpenedToday() {
    try {
      window.localStorage.setItem(FORTUNE_AUTO_OPEN_KEY, getTodayKey());
    } catch (e) {
      /* ignore storage errors */
    }
  }

  function openFortuneDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB is not supported"));
        return;
      }

      var req = window.indexedDB.open(FORTUNE_DB_NAME, 1);

      req.onupgradeneeded = function (event) {
        var db = event.target.result;

        if (!db.objectStoreNames.contains(FORTUNE_STORE_NAME)) {
          db.createObjectStore(FORTUNE_STORE_NAME, {
            keyPath: "id"
          });
        }
      };

      req.onsuccess = function (event) {
        resolve(event.target.result);
      };

      req.onerror = function () {
        reject(req.error || new Error("Failed to open IndexedDB"));
      };
    });
  }

  function saveFortuneCookie(fortuneText) {
    if (!fortuneText) return Promise.resolve();
    return openFortuneDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(FORTUNE_STORE_NAME, "readwrite");
        var store = tx.objectStore(FORTUNE_STORE_NAME);
        store.put({
          id: FORTUNE_KEY,
          text: fortuneText,
          savedAt: new Date().toISOString()
        });

        tx.oncomplete = function () {
          db.close();
          resolve();
        };

        tx.onerror = function () {
          db.close();
          reject(tx.error || new Error("Failed to save fortune cookie"));
        };
      });
    });
  }

  function getSavedFortuneCookie() {
    return openFortuneDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(FORTUNE_STORE_NAME, "readonly");
        var store = tx.objectStore(FORTUNE_STORE_NAME);
        var req = store.get(FORTUNE_KEY);

        req.onsuccess = function () {
          resolve(req.result || null);
        };

        req.onerror = function () {
          reject(req.error || new Error("Failed to read fortune cookie"));
        };

        tx.oncomplete = function () {
          db.close();
        };
      });
    })["catch"](function () {
      return null;
    });
  }

  function applyFortuneToAdvice(fortuneText) {
    if (!fortuneText) return;
    var $buttonLabel = $(".advice-fortune-banner__label");
    if ($buttonLabel.length) $buttonLabel.text("오늘의 포춘쿠키 다시 보기");
  }

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

  function buildPopupUrl(initialFortuneText) {
    var rawUrl = resolvePopupUrl();
    if (!initialFortuneText) return rawUrl;

    try {
      var url = new URL(rawUrl, window.location.origin);
      url.searchParams.set("fortune", initialFortuneText);
      return url.toString();
    } catch (e) {
      var divider = rawUrl.indexOf("?") === -1 ? "?" : "&";
      return rawUrl + divider + "fortune=" + encodeURIComponent(initialFortuneText);
    }
  }

  function openFortunePopup(initialFortuneText) {
    var $overlay = $("#fortunePopupOverlay");
    var $frame = $("#fortunePopupFrame");
    if (!$overlay.length || !$frame.length) return;
    $frame.attr("src", buildPopupUrl(initialFortuneText));
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

  function onPopupMessage(event) {
    if (!event || !event.data || !event.data.type) return;

    if (event.data.type === FORTUNE_CLOSE_TYPE) {
      closeFortunePopup();
      return;
    }

    if (event.data.type !== FORTUNE_MESSAGE_TYPE) return;
    var fortuneText = event.data.fortuneText;
    saveFortuneCookie(fortuneText).then(function () {
      latestFortuneText = fortuneText || "";
      applyFortuneToAdvice(fortuneText);
    })["finally"](function () {
      closeFortunePopup();
    });
  }

  $(function () {
    $("#adviceFortuneBtn").on("click", function (e) {
      e.preventDefault();
      openFortunePopup(latestFortuneText);
    });
    $("#fortunePopupOverlay .advice-fortune-popup__backdrop").on("click", closeFortunePopup);
    $("#fortunePopupOverlay .advice-fortune-popup__close").on("click", closeFortunePopup);
    $(document).on("keydown", function (e) {
      if (e.key !== "Escape") return;
      var el = document.getElementById("fortunePopupOverlay");
      if (el && !el.hasAttribute("hidden")) closeFortunePopup();
    });
    window.addEventListener("message", onPopupMessage);
    getSavedFortuneCookie().then(function (saved) {
      if (saved && saved.text) {
        latestFortuneText = saved.text;
        applyFortuneToAdvice(saved.text);
      }

      if (!saved && !hasAutoOpened && canAutoOpenToday()) {
        hasAutoOpened = true;
        markAutoOpenedToday();
        openFortunePopup();
      }
    });
  });
})(jQuery);
//# sourceMappingURL=advice.dev.js.map
