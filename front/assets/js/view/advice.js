/* views/advice/advice.html — 포춘쿠키 배너 → fortune_popup.html 모달(iframe) */
(function ($) {
  "use strict";

  var POPUP_PATH = "/views/advice/fortune_popup.html";
  /** Dexie DayflowDB 와 이름·버전 충돌 방지 (포춘 전용) */
  var FORTUNE_DB_NAME = "DayflowFortuneCookie";
  var FORTUNE_STORE_NAME = "fortuneCookies";
  var FORTUNE_KEY = "latest";
  var FORTUNE_REVEALED_TYPE = "dayflow:fortune-revealed";
  var FORTUNE_CLOSE_TYPE = "dayflow:fortune-close";
  var latestFortuneText = "";
  var latestFortuneSavedAt = "";

  function hasMeaningfulFortune(saved) {
    return !!(saved && String(saved.text || "").trim());
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
          db.createObjectStore(FORTUNE_STORE_NAME, { keyPath: "id" });
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
          savedAt: new Date().toISOString(),
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
    return openFortuneDb()
      .then(function (db) {
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
      })
      .catch(function () {
        return null;
      });
  }

  function applyFortuneToAdvice(fortuneText) {
    if (!fortuneText) return;
    var $buttonLabel = $(".advice-fortune-banner__label");
    if ($buttonLabel.length) $buttonLabel.text("오늘의 운세를 확인하세요");
  }

  function toLocalDateKey(input) {
    if (!input) return "";
    var date = new Date(input);
    if (isNaN(date.getTime())) return "";
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1);
    var d = String(date.getDate());
    return y + "-" + m + "-" + d;
  }

  function isTodayFortuneSaved() {
    var todayKey = toLocalDateKey(new Date());
    var savedKey = toLocalDateKey(latestFortuneSavedAt);
    return !!todayKey && todayKey === savedKey;
  }

  function getInitialFortuneForPopup() {
    // 같은 날에는 기존 포춘을 다시 보여주고, 날짜가 바뀌면 새 포춘을 열도록 빈 값 전달
    if (isTodayFortuneSaved()) return latestFortuneText;
    return "";
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
    $overlay.attr("aria-hidden", "false");
    if (window.popupL && typeof window.popupL.openPopup === "function") {
      window.popupL.openPopup("fortunePopupOverlay");
    } else {
      $overlay.addClass("on");
      $("body").css("overflow", "hidden");
    }
    setTimeout(function () {
      var $backdrop = $overlay.find(".advice-fortune-popup__backdrop");
      if ($backdrop.length) {
        $backdrop.trigger("focus");
      }
    }, 100);
  }

  function closeFortunePopup() {
    var $overlay = $("#fortunePopupOverlay");
    var $frame = $("#fortunePopupFrame");
    if (!$overlay.length) return;
    $overlay.attr("aria-hidden", "true");
    if (window.popupL && typeof window.popupL.closePopup === "function") {
      window.popupL.closePopup("fortunePopupOverlay");
    } else {
      $overlay.removeClass("on");
      $("body").css("overflow", "");
    }
    $frame.attr("src", "about:blank");
  }

  function onPopupMessage(event) {
    if (!event || !event.data || !event.data.type) return;
    if (event.data.type === FORTUNE_CLOSE_TYPE) {
      closeFortunePopup();
      return;
    }
    if (event.data.type === FORTUNE_REVEALED_TYPE) {
      var revealed = event.data.fortuneText;
      if (!revealed) return;
      saveFortuneCookie(revealed).then(function () {
        latestFortuneText = String(revealed).trim();
        latestFortuneSavedAt = new Date().toISOString();
        applyFortuneToAdvice(latestFortuneText);
      });
      return;
    }
  }

  $(function () {
    $("#adviceFortuneBtn").on("click", function (e) {
      e.preventDefault();
      openFortunePopup(getInitialFortuneForPopup());
    });

    $("#fortunePopupOverlay [data-popup-close='fortunePopupOverlay']").on("click", function () {
      closeFortunePopup();
    });

    $(document).on("keydown", function (e) {
      if (e.key !== "Escape") return;
      var el = document.getElementById("fortunePopupOverlay");
      if (el && el.classList.contains("on")) closeFortunePopup();
    });

    window.addEventListener("message", onPopupMessage);

    function hasAnyEmotionRecord() {
      var db = window.DayflowDB;
      if (!db || !db.emotions) return Promise.resolve(false);
      return db.emotions
        .count()
        .then(function (n) {
          return n > 0;
        })
        .catch(function () {
          return false;
        });
    }

    hasAnyEmotionRecord().then(function (has) {
      var mainContent = document.getElementById("adviceMainContent");
      var emptyEl = document.getElementById("adviceEmptyState");
      if (!has) {
        if (mainContent) mainContent.hidden = true;
        if (emptyEl) emptyEl.removeAttribute("hidden");
        return;
      }
      if (mainContent) mainContent.hidden = false;
      if (emptyEl) emptyEl.setAttribute("hidden", "");

      getSavedFortuneCookie().then(function (saved) {
        if (hasMeaningfulFortune(saved)) {
          latestFortuneText = String(saved.text).trim();
          latestFortuneSavedAt = String(saved.savedAt || "");
          applyFortuneToAdvice(latestFortuneText);
        }
      });
    });
  });
})(jQuery);
