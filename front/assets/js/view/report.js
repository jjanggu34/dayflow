/* views/report/report.html — IndexedDB 감정 집계 + 캘린더 */
(function () {
  "use strict";

  var DOW = ["일", "월", "화", "수", "목", "금", "토"];
  var BAR_COLORS = ["#FF8A65", "#66BB6A", "#42A5F5", "#AB47BC", "#FFCA28", "#26A69A", "#EF5350"];

  var viewMode = "week";
  var anchorDate = new Date();
  anchorDate.setHours(12, 0, 0, 0);

  var monthFp = null;
  /** YYYY-MM-DD → 에너지(평균 score), 월간 달력·주간 행 표시용 */
  var energyByYmdCache = {};

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toYmd(d) {
    var x = d instanceof Date ? d : new Date(d);
    return x.getFullYear() + "-" + pad2(x.getMonth() + 1) + "-" + pad2(x.getDate());
  }

  function parseYmd(s) {
    var p = String(s).split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0, 0);
  }

  function sameYmd(a, b) {
    return toYmd(a) === toYmd(b);
  }

  function sundayOfWeek(d) {
    var x = new Date(d);
    x.setHours(12, 0, 0, 0);
    x.setDate(x.getDate() - x.getDay());
    return x;
  }

  function fetchEmotionsRange(startYmd, endYmd) {
    var db = window.DayflowDB;
    if (!db) return Promise.resolve([]);
    return db.emotions
      .where("date")
      .between(startYmd, endYmd, true, true)
      .toArray()
      .catch(function () {
        return [];
      });
  }

  function scoresByDate(rows) {
    var sums = {};
    var counts = {};
    rows.forEach(function (r) {
      var k = r.date;
      var sc = r.score != null ? r.score : 58;
      sums[k] = (sums[k] || 0) + sc;
      counts[k] = (counts[k] || 0) + 1;
    });
    var out = {};
    Object.keys(sums).forEach(function (k) {
      out[k] = Math.round(sums[k] / counts[k]);
    });
    return out;
  }

  function pickLatestPerDay(rows) {
    var map = {};
    rows.forEach(function (r) {
      var k = r.date;
      if (!map[k] || (r.createdAt || 0) > (map[k].createdAt || 0)) {
        map[k] = r;
      }
    });
    return map;
  }

  function countTypesLatestPerDay(rows) {
    var latest = pickLatestPerDay(rows);
    var c = { best: 0, good: 0, normal: 0, bad: 0, worst: 0 };
    Object.keys(latest).forEach(function (k) {
      var t = latest[k].type || "good";
      if (Object.prototype.hasOwnProperty.call(c, t)) {
        c[t]++;
      }
    });
    return c;
  }

  function typeLabel(t) {
    var chat = window.DayflowEmotionChat;
    if (!chat || !chat.CHAT_EMOTIONS) return t;
    var idx = chat.getIdxFromType(t);
    return chat.CHAT_EMOTIONS[idx] ? chat.CHAT_EMOTIONS[idx].name : t;
  }

  function typeEmoji(t) {
    var chat = window.DayflowEmotionChat;
    if (!chat || !chat.CHAT_EMOTIONS) return "·";
    var idx = chat.getIdxFromType(t);
    return chat.CHAT_EMOTIONS[idx] ? chat.CHAT_EMOTIONS[idx].emoji : "·";
  }

  function typeColor(t) {
    var chat = window.DayflowEmotionChat;
    if (!chat || !chat.CHAT_EMOTIONS) return "#8b7fa8";
    var idx = chat.getIdxFromType(t);
    return chat.CHAT_EMOTIONS[idx] ? chat.CHAT_EMOTIONS[idx].color : "#8b7fa8";
  }

  function formatKoMonthYear(d) {
    return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월";
  }

  function formatRangeKo(a, b) {
    var y1 = a.getFullYear();
    var m1 = a.getMonth() + 1;
    var d1 = a.getDate();
    var y2 = b.getFullYear();
    var m2 = b.getMonth() + 1;
    var d2 = b.getDate();
    if (y1 === y2 && m1 === m2) {
      return y1 + "년 " + m1 + "월 " + d1 + "일–" + d2 + "일 기준";
    }
    return (
      y1 +
      "년 " +
      m1 +
      "월 " +
      d1 +
      "일–" +
      y2 +
      "년 " +
      m2 +
      "월 " +
      d2 +
      "일 기준"
    );
  }

  function ensureMonthPicker() {
    if (monthFp) return;
    var fpOpts = window.flatpickr;
    if (!fpOpts) {
      console.warn("[Report] flatpickr 없음");
      return;
    }
    if (window.flatpickr.l10ns && window.flatpickr.l10ns.ko && typeof window.flatpickr.localize === "function") {
      try {
        window.flatpickr.localize(window.flatpickr.l10ns.ko);
      } catch (e) {}
    }
    var koLoc = { firstDayOfWeek: 0 };
    try {
      if (window.flatpickr.l10ns && window.flatpickr.l10ns.ko) {
        koLoc = Object.assign({}, window.flatpickr.l10ns.ko, { firstDayOfWeek: 0 });
      }
    } catch (e) {}
    monthFp = window.flatpickr("#monthPicker", {
      inline: true,
      locale: koLoc,
      defaultDate: anchorDate,
      onChange: function (selectedDates) {
        if (selectedDates && selectedDates[0]) {
          anchorDate = new Date(selectedDates[0]);
          anchorDate.setHours(12, 0, 0, 0);
          syncCalNavLabel();
          buildPattern();
        }
      },
      onMonthChange: function () {
        syncCalNavLabel();
        buildPattern();
      },
      onReady: function () {
        syncCalNavLabel();
      },
      onDayCreate: function (_sd, _ds, _fp, dayElem) {
        var old = dayElem.querySelector(".flatpickr-day__energy");
        if (old) old.remove();
        var dObj = dayElem.dateObj;
        if (!dObj || isNaN(dObj.getTime())) return;
        var ymd = toYmd(dObj);
        var sub = document.createElement("span");
        sub.className = "flatpickr-day__energy";
        var sc = energyByYmdCache[ymd];
        sub.textContent = sc != null ? String(sc) : "–";
        dayElem.appendChild(sub);
      },
    });
    syncCalNavLabel();
  }

  function syncCalNavLabel() {
    var el = document.getElementById("calNavLabel");
    if (!el) return;
    if (viewMode === "week") {
      el.textContent = formatKoMonthYear(anchorDate);
      return;
    }
    if (monthFp) {
      el.textContent = monthFp.currentYear + "년 " + (monthFp.currentMonth + 1) + "월";
    } else {
      el.textContent = formatKoMonthYear(anchorDate);
    }
  }

  function updateNavButtonsAria() {
    var prev = document.getElementById("calPrev");
    var next = document.getElementById("calNext");
    if (!prev || !next) return;
    if (viewMode === "week") {
      prev.setAttribute("aria-label", "이전 주");
      next.setAttribute("aria-label", "다음 주");
    } else {
      prev.setAttribute("aria-label", "이전 달");
      next.setAttribute("aria-label", "다음 달");
    }
  }

  function renderWeekStrip(scoreMap) {
    scoreMap = scoreMap || {};
    var sun = sundayOfWeek(anchorDate);
    var row = document.getElementById("weekDayRow");
    if (!row) return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    row.innerHTML = "";
    for (var i = 0; i < 7; i++) {
      var dd = new Date(sun);
      dd.setDate(sun.getDate() + i);
      dd.setHours(0, 0, 0, 0);

      var ymd = toYmd(dd);
      var energy = Object.prototype.hasOwnProperty.call(scoreMap, ymd) ? scoreMap[ymd] : null;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "report-day";

      var num = document.createElement("span");
      num.className = "report-day__num";
      num.textContent = String(dd.getDate());
      btn.appendChild(num);

      var ev = document.createElement("span");
      ev.className = "report-day__energy";
      if (energy != null) {
        ev.textContent = String(energy);
      } else {
        ev.classList.add("report-day__energy--empty");
        ev.textContent = "–";
      }
      btn.appendChild(ev);

      var labelTxt = dd.getMonth() + 1 + "월 " + dd.getDate() + "일";
      if (energy != null) {
        labelTxt += ", 에너지 " + energy;
      }
      btn.setAttribute("aria-label", labelTxt);

      var isSel = sameYmd(anchorDate, dd);
      var isFut = dd.getTime() > today.getTime();

      if (isSel) {
        btn.classList.add("is-selected");
      } else if (isFut) {
        btn.classList.add("is-muted");
      } else {
        btn.classList.add("is-past");
      }

      (function (dCopy) {
        btn.addEventListener("click", function () {
          anchorDate = new Date(dCopy);
          anchorDate.setHours(12, 0, 0, 0);
          buildPattern();
        });
      })(dd);

      row.appendChild(btn);
    }
  }

  /** 통합 캘린더 ‹ › : 주간 모드=이전·다음 주, 월간 모드=이전·다음 달 */
  function navigateCal(delta) {
    if (viewMode === "week") {
      var sun = sundayOfWeek(anchorDate);
      sun.setDate(sun.getDate() + delta * 7);
      anchorDate = new Date(sun);
      anchorDate.setHours(12, 0, 0, 0);
      syncCalNavLabel();
      buildPattern();
      return;
    }
    ensureMonthPicker();
    if (!monthFp) return;
    monthFp.changeMonth(delta);
    var lastD = new Date(monthFp.currentYear, monthFp.currentMonth + 1, 0).getDate();
    var d = Math.min(anchorDate.getDate(), lastD);
    anchorDate = new Date(monthFp.currentYear, monthFp.currentMonth, d, 12, 0, 0, 0);
    syncCalNavLabel();
    buildPattern();
  }

  function setCalMode(mode) {
    viewMode = mode;
    var wBtn = document.getElementById("calModeWeek");
    var mBtn = document.getElementById("calModeMonth");
    var wPanel = document.getElementById("calBodyWeek");
    var mPanel = document.getElementById("calBodyMonth");
    if (!wBtn || !mBtn || !wPanel || !mPanel) return;

    var isWeek = mode === "week";
    wBtn.setAttribute("aria-selected", isWeek ? "true" : "false");
    mBtn.setAttribute("aria-selected", !isWeek ? "true" : "false");
    wPanel.hidden = !isWeek;
    mPanel.hidden = isWeek;
    updateNavButtonsAria();

    if (!isWeek) {
      ensureMonthPicker();
      if (monthFp) {
        monthFp.setDate(anchorDate, false);
      }
      syncCalNavLabel();
      buildPattern();
    } else {
      syncCalNavLabel();
      buildPattern();
    }
  }

  function renderWeekBars(scores7, meta) {
    var host = document.getElementById("patWeekBars");
    if (!host) return;
    host.innerHTML = "";
    var vals = scores7.map(function (s) {
      return s == null ? 0 : s;
    });
    var localMax = Math.max.apply(null, vals.concat([1]));

    scores7.forEach(function (score, i) {
      var v = score == null ? 0 : score;
      var col = document.createElement("div");
      col.className = "pat-week-bars__col";

      var wrap = document.createElement("div");
      wrap.className = "pat-week-bars__bar-wrap";
      var bar = document.createElement("div");
      bar.className = "pat-week-bars__bar";
      bar.style.background = BAR_COLORS[i % BAR_COLORS.length];
      bar.style.height = "4px";
      wrap.appendChild(bar);

      var num = document.createElement("span");
      num.className = "pat-week-bars__val";
      num.textContent = String(v);

      var dow = document.createElement("span");
      dow.className = "pat-week-bars__dow";
      dow.textContent = DOW[i];

      col.appendChild(wrap);
      col.appendChild(num);
      col.appendChild(dow);
      host.appendChild(col);

      requestAnimationFrame(function () {
        bar.style.height = Math.max(8, (v / localMax) * 72) + "px";
      });
    });

    host.setAttribute("aria-label", meta || "요일별 에너지 수치");
  }

  function renderRanking(counts) {
    var host = document.getElementById("emotionRankList");
    if (!host) return;
    host.innerHTML = "";

    var order = ["best", "good", "normal", "bad", "worst"];
    var rows = order
      .map(function (t) {
        return { type: t, n: counts[t] || 0 };
      })
      .filter(function (r) {
        return r.n > 0;
      })
      .sort(function (a, b) {
        return b.n - a.n;
      })
      .slice(0, 4);

    var maxN = rows.length ? rows[0].n : 1;

    rows.forEach(function (row) {
      var item = document.createElement("div");
      item.className = "per-item";
      var em = document.createElement("div");
      em.className = "per-item__emoji";
      em.textContent = typeEmoji(row.type);
      em.setAttribute("aria-hidden", "true");

      var meta = document.createElement("div");
      meta.className = "per-item__meta";
      var labelEl = document.createElement("div");
      labelEl.className = "per-item__name";
      labelEl.textContent = typeLabel(row.type);
      var track = document.createElement("div");
      track.className = "per-item__track";
      var fill = document.createElement("div");
      fill.className = "per-item__fill";
      fill.style.background = typeColor(row.type);
      track.appendChild(fill);
      meta.appendChild(labelEl);
      meta.appendChild(track);

      var days = document.createElement("div");
      days.className = "per-item__days";
      days.textContent = row.n + "일";

      item.appendChild(em);
      item.appendChild(meta);
      item.appendChild(days);
      host.appendChild(item);

      requestAnimationFrame(function () {
        fill.style.width = Math.round((row.n / maxN) * 100) + "%";
      });
    });

    if (!rows.length) {
      host.innerHTML = '<p class="report-empty-hint" style="padding:0">기록된 감정 유형이 없습니다.</p>';
    }
  }

  function buildInsights(weekScores7, counts, periodHint) {
    var list = document.getElementById("insightList");
    if (!list) return;
    list.innerHTML = "";

    var bullets = [];
    var nums = weekScores7.map(function (x) {
      return x == null ? 0 : x;
    });
    if (nums.some(function (x) {
      return x > 0;
    })) {
      var hi = 0;
      var lo = 0;
      for (var i = 1; i < nums.length; i++) {
        if (nums[i] > nums[hi]) hi = i;
        if (nums[i] < nums[lo]) lo = i;
      }
      if (nums[hi] > nums[lo]) {
        bullets.push(
          DOW[hi] + "요일에 에너지가 가장 높게 나타나고, " + DOW[lo] + "요일은 상대적으로 낮아요."
        );
      }
    }

    var bestType = Object.keys(counts).sort(function (a, b) {
      return (counts[b] || 0) - (counts[a] || 0);
    })[0];
    if (bestType && counts[bestType] > 0) {
      bullets.push(
        "가장 자주 기록한 감정은 「" + typeLabel(bestType) + "」예요."
      );
    }

    var badish = (counts.bad || 0) + (counts.worst || 0);
    var denom =
      (counts.best || 0) +
      (counts.good || 0) +
      (counts.normal || 0) +
      badish;
    if (denom > 0 && badish / denom >= 0.35) {
      bullets.push(
        "부정적인 감정 비중이 높은 편이에요. 수면과 휴식 리듬을 한 번 점검해 보세요."
      );
    } else if (denom > 0) {
      bullets.push(
        "전반적으로 감정 흐름이 비교적 안정적으로 유지된 기간이에요."
      );
    }

    if (periodHint) {
      bullets.unshift(periodHint);
    }

    if (!bullets.length) {
      bullets.push("아직 분석할 데이터가 충분하지 않아요. 꾸준히 기록해 보세요.");
    }

    bullets.slice(0, 4).forEach(function (text) {
      var li = document.createElement("li");
      li.textContent = text;
      list.appendChild(li);
    });
  }

  /**
   * IndexedDB 감정 데이터를 불러와 패턴 UI를 채웁니다.
   */
  function buildPattern() {
    var sub = document.getElementById("patternSubLabel");
    var empty = document.getElementById("reportEmptyHint");
    var startYmd;
    var endYmd;
    var scores7;
    var metaBars = "";
    var periodHint = "";

    if (viewMode === "week") {
      var sun = sundayOfWeek(anchorDate);
      var sat = new Date(sun);
      sat.setDate(sun.getDate() + 6);
      startYmd = toYmd(sun);
      endYmd = toYmd(sat);
      if (sub) sub.textContent = formatRangeKo(sun, sat);
      periodHint = "선택한 주의 요일별 기록을 보여드려요.";

      return fetchEmotionsRange(startYmd, endYmd).then(function (rows) {
        var bySc = scoresByDate(rows);
        scores7 = [];
        for (var i = 0; i < 7; i++) {
          var dd = new Date(sun);
          dd.setDate(sun.getDate() + i);
          scores7.push(bySc[toYmd(dd)] != null ? bySc[toYmd(dd)] : 0);
        }
        var counts = countTypesLatestPerDay(rows);
        var hasData = rows.length > 0;
        if (empty) empty.hidden = hasData;

        var weekScoreMap = {};
        for (var w = 0; w < 7; w++) {
          var ddw = new Date(sun);
          ddw.setDate(sun.getDate() + w);
          var k = toYmd(ddw);
          if (Object.prototype.hasOwnProperty.call(bySc, k)) {
            weekScoreMap[k] = bySc[k];
          }
        }
        renderWeekStrip(weekScoreMap);
        syncCalNavLabel();

        renderWeekBars(scores7, metaBars);
        renderRanking(counts);
        buildInsights(scores7, counts, periodHint);
        return null;
      });
    }

    ensureMonthPicker();
    var y;
    var m;
    if (monthFp) {
      y = monthFp.currentYear;
      m = monthFp.currentMonth;
    } else {
      y = anchorDate.getFullYear();
      m = anchorDate.getMonth();
    }
    var first = new Date(y, m, 1);
    var last = new Date(y, m + 1, 0);
    startYmd = toYmd(first);
    endYmd = toYmd(last);
    if (sub) sub.textContent = formatKoMonthYear(first) + " 기준";

    return fetchEmotionsRange(startYmd, endYmd).then(function (rows) {
      var bySc = scoresByDate(rows);

      energyByYmdCache = {};
      for (var d = 1; d <= last.getDate(); d++) {
        var cur2 = new Date(y, m, d, 12, 0, 0, 0);
        var ymk = toYmd(cur2);
        if (Object.prototype.hasOwnProperty.call(bySc, ymk)) {
          energyByYmdCache[ymk] = bySc[ymk];
        }
      }

      var sumsByDow = [0, 0, 0, 0, 0, 0, 0];
      var nByDow = [0, 0, 0, 0, 0, 0, 0];
      for (var d = 1; d <= last.getDate(); d++) {
        var cur = new Date(y, m, d, 12, 0, 0, 0);
        var ymdOne = toYmd(cur);
        var wd = cur.getDay();
        if (bySc[ymdOne] != null) {
          sumsByDow[wd] += bySc[ymdOne];
          nByDow[wd]++;
        }
      }
      scores7 = sumsByDow.map(function (s, i) {
        return nByDow[i] ? Math.round(s / nByDow[i]) : 0;
      });

      var counts = countTypesLatestPerDay(rows);
      var hasData = rows.length > 0;
      if (empty) empty.hidden = hasData;

      if (monthFp && typeof monthFp.redraw === "function") {
        monthFp.redraw();
      }

      metaBars =
        formatKoMonthYear(first) + " 동안 요일별 평균 에너지입니다.";
      renderWeekBars(scores7, metaBars);
      renderRanking(counts);
      buildInsights(scores7, counts, "이번 달은 요일마다 평균 에너지를 요약했어요.");
      return null;
    });
  }

  function init() {
    var back = document.getElementById("reportBackBtn");
    if (back) {
      back.addEventListener("click", function () {
        if (window.history.length > 1) {
          window.history.back();
        }
      });
    }

    document.getElementById("calModeWeek").addEventListener("click", function () {
      setCalMode("week");
    });
    document.getElementById("calModeMonth").addEventListener("click", function () {
      setCalMode("month");
    });

    document.getElementById("calPrev").addEventListener("click", function () {
      navigateCal(-1);
    });
    document.getElementById("calNext").addEventListener("click", function () {
      navigateCal(1);
    });

    updateNavButtonsAria();
    syncCalNavLabel();
    buildPattern();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.buildPattern = buildPattern;
})();
