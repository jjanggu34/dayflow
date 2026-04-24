/* views/report/report.html — 월간 요일 바그래프 + 감정 버블 랭킹 */
(function () {
  "use strict";

  var DOW = ["일", "월", "화", "수", "목", "금", "토"];
  var BAR_COLORS = ["##79AAFF", "#A2C4FF", "#C8DCFF", "##C8DCFF", "#E6EFFF", "#C8DCFF", "#A2C4FF"];
  var MOCK_SCORES = [42, 58, 60, 62, 77, 70, 54];
  var MOCK_COUNTS = { best: 9, good: 8, normal: 5, bad: 3, worst: 3 };
  var insightRequestSeq = 0;

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

  var emotionRankIo = null;

  function bindEmotionBubbleReveal(clusterEl) {
    if (!clusterEl) return;
    clusterEl.classList.remove("is-animated");
    if (emotionRankIo) {
      emotionRankIo.disconnect();
      emotionRankIo = null;
    }
    if (!clusterEl.querySelector(".emotion-bubble")) return;

    var revealed = false;
    var fallbackId = 0;

    function revealBubbles() {
      if (revealed) return;
      revealed = true;
      if (fallbackId) {
        clearTimeout(fallbackId);
        fallbackId = 0;
      }
      clusterEl.classList.add("is-animated");
      if (emotionRankIo) {
        emotionRankIo.disconnect();
        emotionRankIo = null;
      }
    }

    /*
     * 좁은 뷰포트(모바일·크롬 DevTools 반응형): root=#bodyWrap 인 IO가 교차를 0으로만 보고
     * isIntersecting 이 안 뜨는 버그가 있어, 스크롤 인 연출 대신 곧바로 표시.
     * 넓은 PC에서는 기존처럼 IO + 지연 폴백.
     */
    var narrowByW = typeof window.innerWidth === "number" && window.innerWidth <= 1024;
    var narrowByMq =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 1024px)").matches;
    if (narrowByW || narrowByMq) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          revealBubbles();
        });
      });
      fallbackId = setTimeout(function () {
        fallbackId = 0;
        revealBubbles();
      }, 450);
      return;
    }

    var scrollRoot = document.getElementById("bodyWrap");
    var ioOpts = { threshold: 0.08 };
    if (scrollRoot) ioOpts.root = scrollRoot;

    emotionRankIo = new IntersectionObserver(function (entries) {
      if (entries[0] && entries[0].isIntersecting) revealBubbles();
    }, ioOpts);
    emotionRankIo.observe(clusterEl);

    fallbackId = setTimeout(function () {
      fallbackId = 0;
      revealBubbles();
    }, 2200);
  }

  /** 반응형 직후 host.clientWidth가 데스크톱 폭으로 남아 left가 1000px대로 나가는 것 방지 */
  function measureBubbleHost(host) {
    var vw =
      typeof window.innerWidth === "number" && window.innerWidth > 0
        ? window.innerWidth
        : 4096;
    var rect = host.getBoundingClientRect();
    var rawW = host.clientWidth || rect.width || 0;
    var rawH = host.clientHeight || rect.height || 0;
    var w = rawW > 0 ? Math.min(Math.round(rawW), Math.round(vw)) : Math.min(320, Math.round(vw));
    var h = rawH > 0 ? Math.max(200, Math.round(rawH)) : 220;
    return { w: w, h: h };
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
    var wallPadding = 10;
    var meta = [];

    rows.forEach(function (row, idx) {
      var bubble = document.createElement("div");
      bubble.className = "emotion-bubble";
      var size = Math.max(64, Math.round(74 + (row.value / max) * 42));
      bubble.style.width = size + "px";
      bubble.style.height = size + "px";
      bubble.style.background = palette[idx] || "#e9edf5";
      bubble.style.setProperty("--bubble-delay", (idx * 0.23).toFixed(2) + "s");
      bubble.style.zIndex = String(20 - idx);
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
      meta.push({ el: bubble, size: size });
    });

    function runBubbleLayout() {
      var dim = measureBubbleHost(host);
      var hostW = dim.w;
      var hostH = dim.h;
      var centerX = hostW / 2;
      var centerY = hostH / 2;
      var n = meta.length;
      var nodes = meta.map(function (m, idx) {
        var angle = (Math.PI * 2 * idx) / Math.max(n, 1);
        var radius = 22 + idx * 6;
        return {
          el: m.el,
          r: m.size / 2,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        };
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

    runBubbleLayout();
    requestAnimationFrame(function () {
      requestAnimationFrame(runBubbleLayout);
    });
  }

  function buildFallbackInsightLines(scores7, counts, isMock) {
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
      lines[0] = "아직 기록이 없어 예시 수치예요. " + lines[0];
    }
    return lines;
  }

  function renderInsightList(list, lines) {
    if (!list) return;
    list.innerHTML = "";
    lines.forEach(function (line) {
      var li = document.createElement("li");
      li.textContent = line;
      list.appendChild(li);
    });
  }

  function stripJsonCodeFence(s) {
    var t = String(s || "").trim();
    if (t.indexOf("```") === 0) {
      t = t.replace(/^```[a-zA-Z0-9]*\s*/, "").replace(/\s*```\s*$/m, "");
    }
    return t.trim();
  }

  function parseInsightJsonArray(text) {
    var raw = stripJsonCodeFence(text);
    var data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return null;
    }
    if (!Array.isArray(data)) return null;
    var out = [];
    for (var i = 0; i < data.length && out.length < 3; i++) {
      if (typeof data[i] !== "string") continue;
      var line = String(data[i]).replace(/\s+/g, " ").trim();
      if (line) out.push(line);
    }
    return out.length === 3 ? out : null;
  }

  function requestReportInsightsAi(scores7, counts, isMock, monthLabel) {
    if (!window.DayflowApiKey || (!DayflowApiKey.has() && !DayflowApiKey.usesServerProxy())) {
      return Promise.resolve(null);
    }
    if (!window.DayflowChatAgent || typeof DayflowChatAgent.sendMessages !== "function") {
      return Promise.resolve(null);
    }

    var dowScores = DOW.map(function (d, i) {
      return d + "요일 평균 점수 " + scores7[i] + (scores7[i] === 0 ? "(해당 요일 기록 없음)" : "");
    }).join("\n");

    var emotionCounts =
      "설렘(best) " +
      (counts.best || 0) +
      "일, 평온함(good) " +
      (counts.good || 0) +
      "일, 활기참(normal) " +
      (counts.normal || 0) +
      "일, 무기력(bad) " +
      (counts.bad || 0) +
      "일, 불안함(worst) " +
      (counts.worst || 0) +
      "일 (하루당 최신 기록 1건만 집계)";

    var userBlock =
      "[대상 월] " +
      monthLabel +
      "\n[샘플 여부] " +
      (isMock ? "예 — 실제 기록이 없어 아래 수치는 예시입니다. 그럼에도 수치에 맞춰 문장을 쓰되, 첫 문장에서 예시 데이터임을 짧게 밝혀 주세요." : "아니오 — 실제 한 달 기록입니다.") +
      "\n\n[요일별]\n" +
      dowScores +
      "\n\n[감정 유형별 일수]\n" +
      emotionCounts;

    return DayflowChatAgent.sendMessages({
      apiKey: DayflowApiKey.get(),
      system:
        "당신은 감정 일기 앱의 월간 리포트 카피라이터입니다. " +
        "입력 수치와 요일·감정 라벨에만 근거해 패턴 인사이트 문장을 정확히 3개 작성하세요. " +
        "한국어 존댓말, 각 문장 90자 이내, 글머리표·번호·따옴표 없이 본문만. " +
        "응답에는 다른 토큰이나 설명 없이 JSON 배열만 출력하세요. 형식: [\"문장1\",\"문장2\",\"문장3\"]",
      messages: [{ role: "user", content: userBlock }],
    })
      .then(function (reply) {
        return parseInsightJsonArray(reply);
      })
      .catch(function () {
        return null;
      });
  }

  function renderInsights(scores7, counts, isMock, monthLabel) {
    var list = document.getElementById("insightList");
    if (!list) return;

    var seq = ++insightRequestSeq;
    var fallback = buildFallbackInsightLines(scores7, counts, isMock);
    renderInsightList(list, fallback);

    requestReportInsightsAi(scores7, counts, isMock, monthLabel).then(function (aiLines) {
      if (seq !== insightRequestSeq || !aiLines) return;
      renderInsightList(list, aiLines);
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
      var heroCharts = document.getElementById("reportHeroAndCharts");
      var insightSec = document.querySelector("#bodyWrap.report-page section.card-content.report-section");
      var emptyState = document.getElementById("reportEmptyState");

      if (!hasData) {
        if (heroCharts) heroCharts.hidden = true;
        if (insightSec) insightSec.hidden = true;
        if (emptyState) emptyState.removeAttribute("hidden");
        return;
      }

      if (heroCharts) heroCharts.hidden = false;
      if (insightSec) insightSec.hidden = false;
      if (emptyState) emptyState.setAttribute("hidden", "");

      var scores7 = averageScoresByDow(rows);
      var counts = countEmotionTypes(rows);

      if (empty) empty.hidden = true;
      renderWeekBars(scores7);
      renderBubbleRanking(counts);
      bindEmotionBubbleReveal(document.getElementById("emotionRankList"));
      renderInsights(scores7, counts, false, monthLabel);
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
