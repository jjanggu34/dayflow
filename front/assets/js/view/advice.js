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
  var SCORE_BY_EMOTION = {
    best: 92,
    good: 76,
    normal: 60,
    bad: 42,
    worst: 25,
  };
  var HEADLINE_BY_EMOTION = {
    best: "기분 좋은 흐름이 이어지는 날",
    good: "안정적이고 균형 잡힌 날",
    normal: "무리하지 않으면 편안한 날",
    bad: "마음을 돌보는 회복의 날",
    worst: "충분한 휴식이 필요한 날",
  };

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

  function getEmotionScore(type) {
    var key = String(type || "").trim();
    if (Object.prototype.hasOwnProperty.call(SCORE_BY_EMOTION, key)) {
      return SCORE_BY_EMOTION[key];
    }
    return 60;
  }

  function getHeadlineByEmotion(type) {
    var key = String(type || "").trim();
    if (Object.prototype.hasOwnProperty.call(HEADLINE_BY_EMOTION, key)) {
      return HEADLINE_BY_EMOTION[key];
    }
    return "오늘의 감정을 차분히 바라보는 날";
  }

  function formatKoreanDate(ymd) {
    if (!ymd) return "";
    var parts = String(ymd).split("-");
    if (parts.length !== 3) return "";
    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);
    var date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return "";
    var weeks = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    return date.getMonth() + 1 + "월 " + date.getDate() + "일 " + weeks[date.getDay()];
  }

  function getLatestDiaryRecord() {
    var db = window.DayflowDB;
    if (!db || !db.diaries) return Promise.resolve(null);
    return db.diaries
      .toArray()
      .then(function (rows) {
        if (!rows || !rows.length) return null;
        rows.sort(function (a, b) {
          var aDate = String(a.date || "");
          var bDate = String(b.date || "");
          if (aDate !== bDate) return bDate.localeCompare(aDate);
          return Number(b.createdAt || 0) - Number(a.createdAt || 0);
        });
        return rows[0];
      })
      .catch(function () {
        return null;
      });
  }

  function clampAdviceToSixLines(text) {
    var cleaned = String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!cleaned) return "";
    var parts = cleaned
      .split(/\n+/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);
    if (!parts.length) return "";
    return parts.slice(0, 6).join("\n");
  }

  function applyAdviceData(row, adviceText) {
    var dateEl = document.getElementById("adviceHeroDate");
    var scoreEl = document.getElementById("adviceHeroScore");
    var headlineEl = document.getElementById("emotion-screen-title");
    var bodyEl = document.getElementById("adviceAiBody");

    if (dateEl && row && row.date) {
      dateEl.textContent = formatKoreanDate(row.date) || dateEl.textContent;
    }
    if (scoreEl && row) {
      scoreEl.textContent = String(getEmotionScore(row.emotion));
    }
    if (headlineEl && row) {
      headlineEl.textContent = getHeadlineByEmotion(row.emotion);
    }
    if (bodyEl && adviceText) {
      bodyEl.textContent = clampAdviceToSixLines(adviceText);
    }
  }

  function applyAdviceExtras(extras) {
    if (!extras) return;
    var colorTextEl = document.getElementById("adviceColorCardText");
    var tag1El = document.getElementById("adviceTag1");
    var tag2El = document.getElementById("adviceTag2");
    var tag3El = document.getElementById("adviceTag3");
    var weatherTipEl = document.getElementById("adviceWeatherTip");
    var careTipEl = document.getElementById("adviceCareTip");

    if (colorTextEl && extras.colorMessage) colorTextEl.textContent = String(extras.colorMessage).trim();
    if (tag1El && extras.tags && extras.tags[0]) tag1El.textContent = "#" + String(extras.tags[0]).replace(/^#/, "").trim();
    if (tag2El && extras.tags && extras.tags[1]) tag2El.textContent = "#" + String(extras.tags[1]).replace(/^#/, "").trim();
    if (tag3El && extras.tags && extras.tags[2]) tag3El.textContent = "#" + String(extras.tags[2]).replace(/^#/, "").trim();
    if (weatherTipEl && extras.weatherTip) weatherTipEl.textContent = String(extras.weatherTip).trim();
    if (careTipEl && extras.careTip) careTipEl.textContent = String(extras.careTip).trim();
  }

  function getCurrentPositionOnce() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error("geolocation_unavailable"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (position) {
          resolve(position);
        },
        function (error) {
          reject(error || new Error("geolocation_failed"));
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    });
  }

  function toWeatherLabel(code) {
    var map = {
      0: "맑음",
      1: "대체로 맑음",
      2: "약간 흐림",
      3: "흐림",
      45: "안개",
      48: "서리 안개",
      51: "이슬비",
      53: "보통 이슬비",
      55: "강한 이슬비",
      61: "약한 비",
      63: "비",
      65: "강한 비",
      71: "약한 눈",
      73: "눈",
      75: "강한 눈",
      80: "소나기",
      81: "강한 소나기",
      82: "매우 강한 소나기",
      95: "천둥번개",
    };
    return map[code] || "변화무쌍한 날씨";
  }

  function getTodayWeatherSummary() {
    return getCurrentPositionOnce()
      .then(function (position) {
        var lat = position.coords.latitude;
        var lon = position.coords.longitude;
        var url =
          "https://api.open-meteo.com/v1/forecast?latitude=" +
          encodeURIComponent(lat) +
          "&longitude=" +
          encodeURIComponent(lon) +
          "&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto";
        return fetch(url).then(function (res) {
          if (!res.ok) throw new Error("weather_fetch_failed");
          return res.json();
        });
      })
      .then(function (data) {
        var current = data && data.current ? data.current : {};
        var daily = data && data.daily ? data.daily : {};
        var temp = current.temperature_2m;
        var weatherCode = current.weather_code;
        var max = daily.temperature_2m_max && daily.temperature_2m_max.length ? daily.temperature_2m_max[0] : null;
        var min = daily.temperature_2m_min && daily.temperature_2m_min.length ? daily.temperature_2m_min[0] : null;
        return {
          ok: true,
          temperature: typeof temp === "number" ? Math.round(temp) : null,
          tempMax: typeof max === "number" ? Math.round(max) : null,
          tempMin: typeof min === "number" ? Math.round(min) : null,
          weatherText: toWeatherLabel(weatherCode),
        };
      })
      .catch(function () {
        return { ok: false, weatherText: "날씨 정보 없음", temperature: null, tempMax: null, tempMin: null };
      });
  }

  function buildWeatherTipFromSummary(weather) {
    if (!weather || !weather.ok) {
      return "오늘 날씨 정보를 불러오지 못했어요. 외출 전 앱에서 날씨를 한 번 더 확인해 보세요.";
    }
    var tempText = weather.temperature != null ? weather.temperature + "°C" : "기온 정보 없음";
    var rangeText =
      weather.tempMin != null && weather.tempMax != null ? " (최저 " + weather.tempMin + "° / 최고 " + weather.tempMax + "°)" : "";
    return tempText + " " + weather.weatherText + " 날씨예요" + rangeText + ". 오늘 컨디션에 맞춰 옷차림을 가볍게 조절해 보세요.";
  }

  function buildAdvicePrompt(row, weather) {
    var diaryDate = row && row.date ? row.date : "";
    var emotion = row && row.emotion ? row.emotion : "normal";
    var content = row && row.content ? String(row.content).trim() : "";
    var summary = row && row.summary ? String(row.summary).trim() : "";

    var weatherLine = "정보 없음";
    if (weather && weather.ok) {
      weatherLine =
        (weather.temperature != null ? weather.temperature + "°C, " : "") +
        weather.weatherText +
        (weather.tempMin != null && weather.tempMax != null ? " (최저 " + weather.tempMin + "° / 최고 " + weather.tempMax + "°)" : "");
    }

    return [
      "너는 감정일기 앱 DAYFLOW의 조언 코치야.",
      "사용자의 마지막 일기 날짜와 내용, 오늘 날씨를 바탕으로 실천 가능한 조언을 한국어로 작성해.",
      "아래 JSON 형식으로만 답변해. 설명/마크다운/코드블록 금지.",
      '{',
      '  "adviceBody": "모바일 기준 최대 6줄 조언 본문",',
      '  "colorMessage": "오늘의 색상 추천 한 문장",',
      '  "tags": ["태그1", "태그2", "태그3"],',
      '  "weatherTip": "오늘 날씨 활용법 한 문장",',
      '  "careTip": "감정 케어 팁 한 문장"',
      '}',
      "모든 문장은 존댓말, 짧고 구체적으로 작성.",
      "",
      "[마지막 일기 날짜]",
      diaryDate,
      "",
      "[감정]",
      emotion,
      "",
      "[요약]",
      summary,
      "",
      "[오늘 날씨]",
      weatherLine,
      "",
      "[원문]",
      content,
    ].join("\n");
  }

  function parseAdviceJson(text) {
    var raw = String(text || "").trim();
    if (!raw) return null;
    var cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      return null;
    }
  }

  function requestAiAdviceFromLatestDiary(row, weather) {
    if (!row) return Promise.resolve(null);
    if (!window.DayflowChatAgent || typeof window.DayflowChatAgent.sendMessages !== "function") {
      return Promise.resolve(null);
    }
    var apiKey = window.DayflowApiKey && typeof window.DayflowApiKey.get === "function" ? window.DayflowApiKey.get() : "";
    return window.DayflowChatAgent
      .sendMessages({
        apiKey: apiKey,
        system: "당신은 한국어 감정 코칭 전문가입니다. 답변은 간결하고 공감적으로 작성합니다.",
        messages: [{ role: "user", content: buildAdvicePrompt(row, weather) }],
      })
      .then(function (text) {
        return parseAdviceJson(text);
      })
      .catch(function () {
        return null;
      });
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
      if (!db || !db.diaries) return Promise.resolve(false);
      return db.diaries
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

      getLatestDiaryRecord().then(function (latestDiary) {
        if (!latestDiary) return;
        applyAdviceData(latestDiary, "");
        getTodayWeatherSummary().then(function (weather) {
          applyAdviceExtras({
            weatherTip: buildWeatherTipFromSummary(weather),
          });
          requestAiAdviceFromLatestDiary(latestDiary, weather).then(function (aiPayload) {
            if (!aiPayload) return;
            applyAdviceData(latestDiary, aiPayload.adviceBody || "");
            applyAdviceExtras({
              colorMessage: aiPayload.colorMessage || "",
              tags: Array.isArray(aiPayload.tags) ? aiPayload.tags.slice(0, 3) : [],
              weatherTip: aiPayload.weatherTip || "",
              careTip: aiPayload.careTip || "",
            });
          });
        });
      });

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
