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

  /** YYYY-MM-DD 문자열을 달력 셀과 동일한 기준(정오 로컬)으로 비교 */
  function ymdToNoon(ymd) {
    var p = String(ymd || "").split("-");
    var y = Number(p[0]);
    var m = Number(p[1]);
    var d = Number(p[2]);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return NaN;
    return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
  }

  function isFutureYmd(ymd, todayYmd) {
    var a = ymdToNoon(ymd);
    var b = ymdToNoon(todayYmd);
    if (isNaN(a) || isNaN(b)) return false;
    return a > b;
  }

  function scrollRecordPanelIntoView(recordPanel) {
    if (!recordPanel || recordPanel.hidden) return;
    requestAnimationFrame(function () {
      var bodyWrap = document.getElementById("bodyWrap");
      if (!bodyWrap) {
        try { recordPanel.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {}
        return;
      }
      // standalone 앱에서 footer가 position:fixed 로 하단을 덮으므로 그 높이만큼 여유를 둠
      var isStandalone = window.matchMedia("(display-mode: standalone)").matches || !!window.navigator.standalone;
      var footerH = isStandalone ? 104 : 0;

      var bodyRect = bodyWrap.getBoundingClientRect();
      var panelRect = recordPanel.getBoundingClientRect();
      var threshold = bodyRect.bottom - footerH;

      if (panelRect.bottom > threshold) {
        bodyWrap.scrollBy({ top: panelRect.bottom - threshold + 12, behavior: "smooth" });
      } else if (panelRect.top < bodyRect.top) {
        bodyWrap.scrollBy({ top: panelRect.top - bodyRect.top - 12, behavior: "smooth" });
      }
    });
  }

  function revealRecordPanel(recordPanel) {
    if (!recordPanel) return;
    recordPanel.removeAttribute("hidden");
    recordPanel.hidden = false;
    scrollRecordPanelIntoView(recordPanel);
  }

  function fetchEmotionMarksForMonth(viewYear, viewMonth1) {
    var store = window.DayflowSupabaseStore;
    if (!store) return Promise.resolve({});
    var yearMonth = viewYear + "-" + pad2(viewMonth1);
    return store.getDiariesForMonth(yearMonth).then(function (rows) {
      var latest = {};
      rows.forEach(function (row) {
        var key = row.date;
        if (!latest[key] || (row.created_at || 0) > (latest[key].created_at || 0)) {
          latest[key] = row;
        }
      });
      var marks = {};
      Object.keys(latest).forEach(function (k) {
        marks[k] = latest[k].emotion || "good";
      });
      return marks;
    }).catch(function () { return {}; });
  }

  function refreshCalendarMarks() {
    if (!calApi || typeof calApi.getView !== "function" || typeof calApi.setMarks !== "function") {
      return Promise.resolve();
    }
    var view = calApi.getView();
    return fetchEmotionMarksForMonth(view.viewYear, view.viewMonth).then(function (marks) {
      calApi.setMarks(marks);
    });
  }

  function fetchDiariesForDay(ymd) {
    var store = window.DayflowSupabaseStore;
    if (!store) return Promise.resolve([]);
    return store.getDiariesForDate(ymd);
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
    if (isFutureYmd(ymd, todayYmd)) {
      if (recordPanel) {
        recordPanel.setAttribute("hidden", "");
        recordPanel.hidden = true;
      } else {
        listWrap.hidden = true;
      }
      return;
    }
    if (recordPanel) {
      revealRecordPanel(recordPanel);
    }
    listWrap.removeAttribute("hidden");
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
        empty.appendChild(document.createTextNode("아직 작성한 일기가 없어요."));
        var emptyCta = document.createElement("span");
        emptyCta.className = "calendar-list__empty-cta";
        emptyCta.textContent = "일기쓰러가기";
        empty.appendChild(emptyCta);
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
        scrollRecordPanelIntoView(recordPanel);
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
        sum.textContent = isTodayRow ? formatTime(row.created_at) + " · " + diarySummary(row) : diarySummary(row);

        var delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "calendar-list__delete";
        delBtn.setAttribute("aria-label", "기록 삭제");
        delBtn.textContent = "삭제";
        delBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (!confirm("이 기록을 삭제할까요?")) return;
          DayflowSupabaseStore.deleteDiary(row.id).then(function () {
            refreshCalendarMarks().then(function () {
              renderDayPanel(ymd);
            });
          }).catch(function () {
            alert("삭제 중 오류가 발생했습니다.");
          });
        });

        li.appendChild(mood);
        li.appendChild(sum);
        li.appendChild(delBtn);
        listEl.appendChild(li);
      });
      scrollRecordPanelIntoView(recordPanel);
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

  function loadUserName() {
    var nameEl = document.getElementById("mainUserName");
    if (!nameEl || !window.DayflowAuth) return;
    DayflowAuth.getCurrentUser().then(function (user) {
      if (!user) { window.location.replace("/login"); return; }
      var name = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name))
        || user.email.split("@")[0];
      nameEl.textContent = name + "님";
    });
  }

  function init() {
    var cta = document.getElementById("mainCtaBtn");
    if (cta) cta.addEventListener("click", goEmotion);

    var logoutBtn = document.getElementById("mainLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        DayflowAuth.signOut().then(function () {
          window.location.replace("/login");
        });
      });
    }

    loadUserName();
    initCalendar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
