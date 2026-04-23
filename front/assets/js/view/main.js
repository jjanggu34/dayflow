/* views/main/main.html — 홈: DayflowCalendar + 일별 기록 */
(function () {
  "use strict";

  var DOW = ["일", "월", "화", "수", "목", "금", "토"];
  var STORAGE_DIARY = "dayflow_diary_summary";
  var STORAGE_CHAT_SUMMARY = "dayflow_diary_chat_summary";
  var STORAGE_SELECTED_DATE = "dayflow_selected_date";

  var EMOTION_LABEL = {
    best: "설렘",
    good: "평온함",
    normal: "활기참",
    bad: "무기력",
    worst: "불안함",
  };

  var calApi = null;
  var currentSelectedYmd = "";

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toYmd(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function monthRangeYmd(viewYear, viewMonth1) {
    var last = new Date(viewYear, viewMonth1, 0).getDate();
    return {
      start: viewYear + "-" + pad2(viewMonth1) + "-01",
      end: viewYear + "-" + pad2(viewMonth1) + "-" + pad2(last),
    };
  }

  function pickLatestEmotionByDate(rows) {
    var map = {};
    rows.forEach(function (row) {
      var key = row.date;
      if (!map[key] || (row.createdAt || 0) > (map[key].createdAt || 0)) {
        map[key] = row;
      }
    });
    return map;
  }

  function fetchEmotionMarksForMonth(viewYear, viewMonth1) {
    var db = window.DayflowDB;
    if (!db || !db.emotions) return Promise.resolve({});
    var r = monthRangeYmd(viewYear, viewMonth1);
    return db.emotions
      .where("date")
      .between(r.start, r.end, true, true)
      .toArray()
      .then(function (rows) {
        var latest = pickLatestEmotionByDate(rows);
        var marks = {};
        Object.keys(latest).forEach(function (k) {
          marks[k] = latest[k].type || "good";
        });
        return marks;
      })
      .catch(function () {
        return {};
      });
  }

  function fetchDiariesForDay(ymd) {
    var db = window.DayflowDB;
    if (!db || !db.diaries) return Promise.resolve([]);
    return db.diaries
      .where("date")
      .equals(ymd)
      .toArray()
      .then(function (rows) {
        rows.sort(function (a, b) {
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        return rows;
      })
      .catch(function () {
        return [];
      });
  }

  function formatDayTitle(ymd, count) {
    var p = String(ymd).split("-");
    var y = Number(p[0]);
    var m = Number(p[1]);
    var d = Number(p[2]);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return "";
    var dt = new Date(y, m - 1, d, 12, 0, 0, 0);
    var w = DOW[dt.getDay()];
    return m + "월 " + d + "일 " + w + "요일 <span>· " + count + "개의 기록</span>";
  }

  function formatTime(createdAt) {
    var dt = new Date(Number(createdAt) || Date.now());
    return pad2(dt.getHours()) + ":" + pad2(dt.getMinutes());
  }

  function diarySummary(row) {
    var s = (row && row.summary) || (row && row.content) || "";
    s = String(s).replace(/\s+/g, " ").trim();
    if (s.length > 72) s = s.slice(0, 72) + "…";
    return s || "이날의 기록을 함께 돌아봐요.";
  }

  function openResultWithRow(row) {
    try {
      var emotionKey =
        window.DayflowEmotionChat && window.DayflowEmotionChat.STORAGE_EMOTION_KEY
          ? window.DayflowEmotionChat.STORAGE_EMOTION_KEY
          : "dayflow_emotion_type";
      var flowDoneKey =
        window.DayflowEmotionChat && window.DayflowEmotionChat.STORAGE_CHAT_FLOW_DONE
          ? window.DayflowEmotionChat.STORAGE_CHAT_FLOW_DONE
          : "dayflow_chat_flow_done";
      sessionStorage.setItem(emotionKey, String((row && row.emotion) || "good"));
      sessionStorage.setItem(flowDoneKey, "1");
      sessionStorage.setItem(STORAGE_DIARY, String((row && row.content) || (row && row.summary) || "").slice(0, 2000));
      sessionStorage.removeItem(STORAGE_CHAT_SUMMARY);
    } catch (e) {}
    goResult();
  }

  function emotionClass(em) {
    var t = em === "worst" || em === "bad" || em === "normal" || em === "good" || em === "best" ? em : "good";
    return "ico-" + t;
  }

  function renderDayPanel(ymd) {
    var titleEl = document.getElementById("calendarDayTitle");
    var listEl = document.getElementById("calendarDayList");
    var recordPanel = document.getElementById("calendarDayRecord");
    var listWrap = recordPanel ? recordPanel.querySelector(".calendar-list") : document.querySelector(".calendar-list");
    if (!titleEl || !listEl || !listWrap) return;

    var todayYmd = toYmd(new Date());
    if (String(ymd || "") > todayYmd) {
      if (recordPanel) recordPanel.hidden = true;
      else listWrap.hidden = true;
      return;
    }
    if (recordPanel) recordPanel.hidden = false;
    listWrap.hidden = false;

    titleEl.textContent = "불러오는 중…";
    listEl.innerHTML = "";

    fetchDiariesForDay(ymd).then(function (rows) {
      titleEl.innerHTML = formatDayTitle(ymd, rows.length);

      if (!rows.length) {
        var empty = document.createElement("li");
        empty.className = "calendar-list__empty calendar-list__empty--action";
        empty.setAttribute("role", "button");
        empty.tabIndex = 0;
        empty.textContent = "아직 작성한 일기가 없어요.";
        empty.addEventListener("click", function () {
          try {
            sessionStorage.setItem(STORAGE_SELECTED_DATE, String(ymd));
          } catch (e) {}
          goEmotion();
        });
        empty.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            try {
              sessionStorage.setItem(STORAGE_SELECTED_DATE, String(ymd));
            } catch (e2) {}
            goEmotion();
          }
        });
        listEl.appendChild(empty);
        return;
      }

      rows.forEach(function (row) {
        var em = row.emotion || "good";
        var isTodayRow = String(ymd) === toYmd(new Date());
        var li = document.createElement("li");
        li.setAttribute("role", "button");
        li.tabIndex = 0;
        li.addEventListener("click", function () {
          openResultWithRow(row);
        });
        li.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openResultWithRow(row);
          }
        });

        var mood = document.createElement("em");
        mood.className = emotionClass(em);
        mood.textContent = EMOTION_LABEL[em] || EMOTION_LABEL.good;

        var sum = document.createElement("span");
        sum.className = "calendar-list__summary";
        sum.textContent = isTodayRow ? formatTime(row.createdAt) + " · " + diarySummary(row) : diarySummary(row);

        li.appendChild(mood);
        li.appendChild(sum);
        listEl.appendChild(li);
      });
    });
  }

  function resolveChatFlowUrl(page) {
    var p = "";
    try {
      p = String(location.pathname || "");
    } catch (e) {
      p = "";
    }
    var inPrettyRoute = !!p && p.charAt(0) === "/" && p.indexOf("/views/") !== 0 && !/\.html$/i.test(p);
    if (inPrettyRoute) {
      if (page === "emotion") return "/chat/emotion";
      if (page === "chat") return "/chat";
      return "/chat/result";
    }
    if (window.DayflowEmotionChat && typeof DayflowEmotionChat.urlChatFlow === "function") {
      return DayflowEmotionChat.urlChatFlow(page);
    }
    if (page === "emotion") return "/chat/emotion";
    if (page === "chat") return "/chat";
    return "/chat/result";
  }

  function goChat() {
    window.location.href = resolveChatFlowUrl("chat");
  }

  function goResult() {
    window.location.href = resolveChatFlowUrl("result");
  }

  function goEmotion() {
    window.location.href = resolveChatFlowUrl("emotion");
  }

  function initCalendar() {
    var host = document.getElementById("mainCalendarHost");
    if (!host || !window.DayflowCalendar) return;

    var now = new Date();
    var viewYear = now.getFullYear();
    var viewMonth1 = now.getMonth() + 1;
    currentSelectedYmd = "";

    function bindMonth(y, m1) {
      return fetchEmotionMarksForMonth(y, m1).then(function (marks) {
        if (calApi && typeof calApi.setMarks === "function") {
          calApi.setMarks(marks);
        }
        return marks;
      });
    }

    calApi = DayflowCalendar.mount(host, {
      viewYear: viewYear,
      viewMonth: viewMonth1,
      selectedYmd: "",
      marks: {},
      onSelect: function (d) {
        currentSelectedYmd = d.ymd;
        renderDayPanel(d.ymd);
      },
      onMonthChange: function (v) {
        bindMonth(v.viewYear, v.viewMonth);
      },
    });

    bindMonth(viewYear, viewMonth1);

    function refreshCurrentCalendar() {
      if (!calApi || typeof calApi.getView !== "function") return;
      var view = calApi.getView();
      bindMonth(view.viewYear, view.viewMonth).then(function () {
        if (currentSelectedYmd) {
          renderDayPanel(currentSelectedYmd);
        }
      });
    }
    window.addEventListener("pageshow", refreshCurrentCalendar);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") refreshCurrentCalendar();
    });
  }

  function init() {
    var cta = document.getElementById("mainCtaBtn");
    if (cta) cta.addEventListener("click", goEmotion);

    initCalendar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
