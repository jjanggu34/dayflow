/* views/report/report.html — 월간 요일 바그래프 + 감정 버블 랭킹 */
(function () {
  "use strict";

  var DOW = ["일", "월", "화", "수", "목", "금", "토"];
  var BAR_COLORS = ["#d0d5dd", "#c8ced9", "#c2c8d5", "#bcc3d1", "#b6bdce", "#b0b8ca", "#aab2c6"];
  var MOCK_SCORES = [42, 58, 60, 62, 77, 70, 54];
  var MOCK_COUNTS = { best: 9, good: 8, normal: 5, bad: 3, worst: 3 };

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toYmd(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function currentMonthRange() {
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);
    var end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12, 0, 0, 0);
    return { start: start, end: end };
  }

  function fetchEmotionsRange(startYmd, endYmd) {
    var db = window.DayflowDB;
    if (!db || !db.emotions) return Promise.resolve([]);
    return db.emotions
      .where("date")
      .between(startYmd, endYmd, true, true)
      .toArray()
      .catch(function () {
        return [];
      });
  }

  function pickLatestPerDay(rows) {
    var map = {};
    rows.forEach(function (row) {
      var key = row.date;
      if (!map[key] || (row.createdAt || 0) > (map[key].createdAt || 0)) {
        map[key] = row;
      }
    });
    return map;
  }

  function averageScoresByDow(rows) {
    var sum = [0, 0, 0, 0, 0, 0, 0];
    var cnt = [0, 0, 0, 0, 0, 0, 0];
    rows.forEach(function (row) {
      if (!row || !row.date) return;
      var parts = String(row.date).split("-");
      var dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0, 0);
      if (isNaN(dt.getTime())) return;
      var dow = dt.getDay();
      var score = row.score != null ? Number(row.score) : 58;
      sum[dow] += score;
      cnt[dow] += 1;
    });
    return sum.map(function (v, i) {
      return cnt[i] ? Math.round(v / cnt[i]) : 0;
    });
  }

  function countEmotionTypes(rows) {
    var latest = pickLatestPerDay(rows);
    var out = { best: 0, good: 0, normal: 0, bad: 0, worst: 0 };
    Object.keys(latest).forEach(function (key) {
      var t = latest[key].type || "good";
      if (Object.prototype.hasOwnProperty.call(out, t)) out[t] += 1;
    });
    return out;
  }

  function typeLabel(type) {
    var map = {
      best: "설렘",
      good: "평온함",
      normal: "활기참",
      bad: "무기력",
      worst: "불안함",
    };
    return map[type] || type;
  }

  function renderWeekBars(scores7) {
    var host = document.getElementById("patWeekBars");
    if (!host) return;
    host.innerHTML = "";

    var max = Math.max.apply(null, scores7.concat([1]));
    scores7.forEach(function (score, idx) {
      var col = document.createElement("div");
      col.className = "pat-week-bars__col";

      var wrap = document.createElement("div");
      wrap.className = "pat-week-bars__bar-wrap";

      var bar = document.createElement("div");
      bar.className = "pat-week-bars__bar";
      bar.style.height = "6px";
      bar.style.background = BAR_COLORS[idx];
      wrap.appendChild(bar);

      var val = document.createElement("span");
      val.className = "pat-week-bars__val";
      val.textContent = String(score);

      var dow = document.createElement("span");
      dow.className = "pat-week-bars__dow";
      dow.textContent = DOW[idx];

      col.appendChild(wrap);
      col.appendChild(val);
      col.appendChild(dow);
      host.appendChild(col);

      requestAnimationFrame(function () {
        bar.style.height = Math.max(16, Math.round((score / max) * 88)) + "px";
      });
    });
  }

  function renderBubbleRanking(counts) {
    var host = document.getElementById("emotionRankList");
    if (!host) return;
    host.innerHTML = "";

    var rows = Object.keys(counts)
      .map(function (type) {
        return { type: type, value: counts[type] || 0 };
      })
      .filter(function (item) {
        return item.value > 0;
      })
      .sort(function (a, b) {
        return b.value - a.value;
      })
      .slice(0, 5);

    if (!rows.length) return;

    var max = rows[0].value || 1;
    var palette = ["#6e9bf6", "#dfe7f8", "#e8edf8", "#eceff4", "#f2f4f8"];
    var hostW = host.clientWidth || 320;
    var hostH = host.clientHeight || 220;
    var centerX = hostW / 2;
    var centerY = hostH / 2;
    var wallPadding = 10;
    var nodes = [];

    rows.forEach(function (row, idx) {
      var bubble = document.createElement("div");
      bubble.className = "emotion-bubble";
      var size = Math.max(64, Math.round(74 + (row.value / max) * 42));
      bubble.style.width = size + "px";
      bubble.style.height = size + "px";
      bubble.style.background = palette[idx] || "#e9edf5";
      if (idx === 0) bubble.classList.add("is-top");

      var title = document.createElement("strong");
      title.className = "emotion-bubble__name";
      title.textContent = typeLabel(row.type);

      var day = document.createElement("span");
      day.className = "emotion-bubble__days";
      day.textContent = row.value + "일";

      bubble.appendChild(title);
      bubble.appendChild(day);
      host.appendChild(bubble);

      var angle = (Math.PI * 2 * idx) / Math.max(rows.length, 1);
      var radius = 22 + idx * 6;
      nodes.push({
        el: bubble,
        r: size / 2,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    });

    for (var t = 0; t < 220; t++) {
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        a.x += (centerX - a.x) * 0.055;
        a.y += (centerY - a.y) * 0.055;

        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j];
          var dx = b.x - a.x;
          var dy = b.y - a.y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          var minDist = a.r + b.r + 6;
          if (dist < minDist) {
            var push = (minDist - dist) * 0.5;
            var nx = dx / dist;
            var ny = dy / dist;
            a.x -= nx * push;
            a.y -= ny * push;
            b.x += nx * push;
            b.y += ny * push;
          }
        }
      }
    }

    nodes.forEach(function (node) {
      var px = Math.max(node.r + wallPadding, Math.min(hostW - node.r - wallPadding, node.x));
      var py = Math.max(node.r + wallPadding, Math.min(hostH - node.r - wallPadding, node.y));
      node.el.style.left = px + "px";
      node.el.style.top = py + "px";
    });
  }

  function renderInsights(scores7, counts, isMock) {
    var list = document.getElementById("insightList");
    if (!list) return;
    list.innerHTML = "";

    var hi = 0;
    var lo = 0;
    for (var i = 1; i < scores7.length; i++) {
      if (scores7[i] > scores7[hi]) hi = i;
      if (scores7[i] < scores7[lo]) lo = i;
    }

    var topType = Object.keys(counts).sort(function (a, b) {
      return (counts[b] || 0) - (counts[a] || 0);
    })[0];

    var lines = [
      DOW[hi] + "요일 에너지가 가장 높고, " + DOW[lo] + "요일이 가장 낮게 나타나요.",
      "가장 자주 나타난 감정은 " + typeLabel(topType) + "입니다.",
      "주 중반 이후 에너지가 내려갈 때 휴식 루틴을 넣으면 좋아요.",
    ];
    if (isMock) {
      lines.unshift("아직 기록 데이터가 없어 샘플 데이터로 리포트를 보여드려요.");
    }

    lines.forEach(function (line) {
      var li = document.createElement("li");
      li.textContent = line;
      list.appendChild(li);
    });
  }

  function buildReport() {
    var range = currentMonthRange();
    var monthLabel = range.start.getMonth() + 1 + "월";
    var sub = document.getElementById("patternSubLabel");
    var empty = document.getElementById("reportEmptyHint");
    if (sub) sub.textContent = monthLabel + " 요일별 감정 점수 평균을 보여드려요.";

    return fetchEmotionsRange(toYmd(range.start), toYmd(range.end)).then(function (rows) {
      var hasData = rows.length > 0;
      var scores7 = hasData ? averageScoresByDow(rows) : MOCK_SCORES.slice();
      var counts = hasData ? countEmotionTypes(rows) : Object.assign({}, MOCK_COUNTS);

      if (empty) empty.hidden = hasData;
      renderWeekBars(scores7);
      renderBubbleRanking(counts);
      renderInsights(scores7, counts, !hasData);
    });
  }

  function init() {
    var back =
      document.getElementById("reportBackBtn") ||
      document.getElementById("chatBackBtn");
    if (back) {
      back.addEventListener("click", function () {
        if (window.history.length > 1) window.history.back();
      });
    }
    buildReport();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
