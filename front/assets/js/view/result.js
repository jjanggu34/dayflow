/* views/chat/result.html — 오늘의 분석 */
(function () {
  "use strict";

  var STORAGE_DIARY = "dayflow_diary_summary";
  var STORAGE_CHAT_SUMMARY = "dayflow_diary_chat_summary";

  var PACKS = {
    best: {
      headline: "에너지 넘치고 성취감 가득한 하루",
      subline: "밝은 기운이 하루를 활기차게 이끌어요!",
      moodLabel: "활기찬",
      total: 88,
      chatSummaryFallback:
        "오늘은 스스로에게 힘을 실어 주며 하루를 밀도 있게 보내신 것 같아요. 하고 싶은 일에 몰입하고, 쉴 때는 가볍게 숨 고르기도 잘하셨어요.",
      tags: ["#성취", "#에너지"],
      metrics: [
        { name: "에너지", value: 88 },
        { name: "안정감", value: 79 },
        { name: "집중력", value: 92 },
        { name: "긍정성", value: 84 },
      ],
      insights: [
        "오늘은 스스로를 믿고 나아가기 좋은 날이에요.",
        "밝은 마음이 주변과의 대화도 더 수월하게 만들어요.",
      ],
    },
    good: {
      headline: "안정적이고 균형 잡힌 하루",
      subline: "평온한 에너지가 하루를 차분하게 이끌어요!",
      moodLabel: "평온함",
      total: 72,
      chatSummaryFallback:
        "해야 할 일을 차근차근 정리하고 중요한 일에 집중하면서, 일과 휴식의 균형 속에 무리 없이 하루를 마무리했어요.",
      tags: ["#안정", "#집중"],
      metrics: [
        { name: "에너지", value: 65 },
        { name: "안정감", value: 76 },
        { name: "집중력", value: 68 },
        { name: "긍정성", value: 70 },
      ],
      insights: [
        "오전의 집중이 하루 전체 흐름을 잡아줬어요.",
        "평온한 상태에서 깊은 작업이 잘 돼요.",
      ],
    },
    normal: {
      headline: "잔잔하게 흘러간 하루",
      subline: "특별한 날은 아니어도, 그 자체로 괜찮은 하루예요.",
      moodLabel: "평온",
      total: 58,
      chatSummaryFallback:
        "특별한 일정 없이도 나만의 속도로 하루를 지나가셨어요. 익숙한 루틴이 마음을 조용히 받쳐 주었을 거예요.",
      tags: ["#일상", "#정리"],
      metrics: [
        { name: "에너지", value: 55 },
        { name: "안정감", value: 62 },
        { name: "집중력", value: 58 },
        { name: "긍정성", value: 54 },
      ],
      insights: [
        "무난한 날에는 작은 성취 하나만 챙겨도 충분해요.",
        "감정 기복이 크지 않을 때는 루틴을 살짝 바꿔 보세요.",
      ],
    },
    bad: {
      headline: "조금 무거웠던 하루",
      subline: "힘든 날은 잠깐 쉬어 가도 괜찮아요.",
      moodLabel: "처짐",
      total: 42,
      chatSummaryFallback:
        "몸이나 마음이 무거운 순간도 있었지만, 그래도 하루를 지나오셨어요. 오늘은 조금 덜 해도 괜찮다는 걸 스스로에게도 말해 주세요.",
      tags: ["#회복", "#휴식"],
      metrics: [
        { name: "에너지", value: 38 },
        { name: "안정감", value: 44 },
        { name: "집중력", value: 40 },
        { name: "긍정성", value: 36 },
      ],
      insights: [
        "의욕이 떨어질 땐 목표를 아주 작게 나눠 보세요.",
        "가벼운 산책이나 스트레칭이 부담을 덜어 줄 수 있어요.",
      ],
    },
    worst: {
      headline: "버거움이 큰 하루",
      subline: "지금은 버티는 것만으로도 충분히 큰 일이에요.",
      moodLabel: "고강도 스트레스",
      total: 28,
      chatSummaryFallback:
        "버거움이 큰 하루였을 수 있어요. 지금은 잠시 멈춰 서도 되는 구간일지도 몰라요. 혼자 다 짊어지지 않아도 괜찮습니다.",
      tags: ["#안전", "#지지"],
      metrics: [
        { name: "에너지", value: 22 },
        { name: "안정감", value: 26 },
        { name: "집중력", value: 24 },
        { name: "긍정성", value: 20 },
      ],
      insights: [
        "당장 해결하지 않아도 괜찮은 일들이 있어요.",
        "수면과 식사, 물처럼 기본 리듬을 먼저 챙겨 주세요.",
      ],
    },
  };

  var WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

  function formatTodayLabel() {
    var d = new Date();
    return d.getMonth() + 1 + "." + d.getDate() + " (" + WEEKDAYS[d.getDay()] + ")";
  }

  function getEmotionType() {
    var key = window.DayflowEmotionChat ? DayflowEmotionChat.STORAGE_EMOTION_KEY : "dayflow_emotion_type";
    try {
      var t = sessionStorage.getItem(key);
      if (t && Object.prototype.hasOwnProperty.call(PACKS, t)) return t;
    } catch (e) {}
    return "good";
  }

  function getDiaryText() {
    try {
      return (sessionStorage.getItem(STORAGE_DIARY) || "").trim();
    } catch (e) {
      return "";
    }
  }

  /**
   * 결과 화면용 짧은 요약: 첫 문단(빈 줄 전) 우선, 길면 글자 수 제한 + 말줄임.
   * (AI 요약 아님 — 클라이언트에서만 잘라 보여 줌)
   */
  function summarizeDiaryForResult(text, maxLen) {
    maxLen = typeof maxLen === "number" && maxLen > 40 ? maxLen : 200;
    var s = String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();
    if (!s) return "";
    var block = (s.split(/\n\s*\n/)[0] || s).trim();
    if (block.length <= maxLen) return block;
    var cut = block.slice(0, maxLen);
    var sp = cut.lastIndexOf(" ");
    if (sp > Math.floor(maxLen * 0.55)) cut = cut.slice(0, sp);
    cut = cut.replace(/[,，、]\s*$/, "").trim();
    return cut + "…";
  }

  function getStoredChatNarrativeSummary() {
    try {
      return (sessionStorage.getItem(STORAGE_CHAT_SUMMARY) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function requestChatNarrativeSummary(raw, onDone) {
    if (typeof onDone !== "function") onDone = function () {};
    var t = String(raw || "").trim();
    if (t.length < 12) {
      onDone("");
      return;
    }
    if (!window.DayflowApiKey || !DayflowApiKey.has() || !window.DayflowChatAgent || typeof DayflowChatAgent.sendMessages !== "function") {
      onDone("");
      return;
    }
    DayflowChatAgent.sendMessages({
      apiKey: DayflowApiKey.get(),
      system:
        "당신은 감정 일기 앱의 편집자입니다. 아래는 사용자가 챗봇과 나눈 하루 기록입니다. " +
        "2~3문장 정도의 한국어 존댓말로 한 덩어리만 써 주세요. 글머리표·따옴표·제목 없이 본문만. " +
        "대화에 없는 사실은 지어내지 마세요.",
      messages: [{ role: "user", content: "[일기 대화]\n\n" + t.slice(0, 12000) }],
    })
      .then(function (reply) {
        onDone(String(reply || "").trim());
      })
      .catch(function () {
        onDone("");
      });
  }

  function renderTags(container, tags) {
    container.innerHTML = "";
    var max = Math.min(2, tags.length);
    for (var i = 0; i < max; i++) {
      var span = document.createElement("span");
      span.className = "result-tags__tag";
      span.textContent = tags[i];
      container.appendChild(span);
    }
  }

  function renderMetrics(listEl, metrics) {
    listEl.innerHTML = "";
    for (var i = 0; i < metrics.length; i++) {
      var m = metrics[i];
      var v = Math.max(0, Math.min(100, m.value));
      var li = document.createElement("li");
      li.className = "result-metrics__cell";
      li.innerHTML =
        '<p class="result-metrics__value-top"></p>' +
        '<div class="result-metrics__bar-wrap"><div class="result-metrics__bar"><div class="result-metrics__fill"></div></div></div>' +
        '<span class="result-metrics__name"></span>';
      li.querySelector(".result-metrics__value-top").textContent = String(v);
      li.querySelector(".result-metrics__name").textContent = m.name;
      li.querySelector(".result-metrics__fill").style.width = v + "%";
      listEl.appendChild(li);
    }
  }

  /** 반원 게이지: 100점 만점, 회색 트랙 위로 점수만큼 색 채움(애니메이션) */
  function applyGaugeScore(score) {
    var arc = document.getElementById("resultGaugeArc");
    var wrap = document.getElementById("resultGauge");
    if (!arc || !wrap) return;
    var s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
    wrap.style.setProperty("--gauge-score", String(s));
    arc.style.strokeDasharray = "100";
    arc.style.strokeDashoffset = "100";
    arc.getBoundingClientRect();
    window.requestAnimationFrame(function () {
      arc.style.strokeDashoffset = String(100 - s);
    });
  }

  function renderInsights(listEl, lines) {
    listEl.innerHTML = "";
    for (var i = 0; i < lines.length; i++) {
      var li = document.createElement("li");
      li.textContent = lines[i];
      listEl.appendChild(li);
    }
  }

  function setPlaceholderStats() {
    var wVal = document.getElementById("resultStatWeatherVal");
    var wSub = document.getElementById("resultStatWeatherSub");
    var cVal = document.getElementById("resultStatComfortVal");
    var cSub = document.getElementById("resultStatComfortSub");
    var lVal = document.getElementById("resultStatLuckVal");
    var lSub = document.getElementById("resultStatLuckSub");
    if (wVal) wVal.textContent = "26°";
    if (wSub) wSub.textContent = "맑음";
    if (cVal) cVal.textContent = "71";
    if (cSub) cSub.textContent = "주의";
    if (lVal) lVal.textContent = "★4.1";
    if (lSub) lSub.textContent = "상승";
  }

  function init() {
    var type = getEmotionType();
    var pack = PACKS[type] || PACKS.good;
    var bodyWrap = document.getElementById("bodyWrap");
    if (bodyWrap) {
      bodyWrap.classList.add("result-page--" + type);
    }

    var headerDate = document.getElementById("resultHeaderDate");
    if (headerDate) headerDate.textContent = formatTodayLabel();

    var headline = document.getElementById("resultHeadline");
    var subline = document.getElementById("resultSubline");
    var totalScore = document.getElementById("resultTotalScore");
    var moodLabel = document.getElementById("resultMoodLabel");
    var tags = document.getElementById("resultTags");
    var metricsList = document.getElementById("resultMetricsList");
    var insightsList = document.getElementById("resultInsightsList");
    var diaryBody = document.getElementById("resultDiaryBody");

    if (headline) headline.textContent = pack.headline;
    if (subline) subline.textContent = pack.subline;
    if (totalScore) totalScore.textContent = String(pack.total);
    if (moodLabel) moodLabel.textContent = pack.moodLabel;
    if (tags) renderTags(tags, pack.tags);
    if (metricsList) renderMetrics(metricsList, pack.metrics);
    applyGaugeScore(pack.total);
    if (insightsList) renderInsights(insightsList, pack.insights);

    if (typeof window.DayflowResultWeather !== "undefined" && DayflowResultWeather.fillResultStatusCards) {
      DayflowResultWeather.fillResultStatusCards({ onFail: setPlaceholderStats });
    } else {
      setPlaceholderStats();
    }

    if (diaryBody) {
      function showDiaryEmpty() {
        diaryBody.textContent = "아직 기록된 일기가 없어요. 채팅에서 이야기를 나눠 주세요.";
        diaryBody.classList.add("is-empty");
      }

      function showNarrativeFromRaw(raw) {
        var stored = getStoredChatNarrativeSummary();
        if (stored) {
          diaryBody.textContent = stored;
          diaryBody.classList.remove("is-empty");
          return;
        }
        var r = String(raw || "").trim();
        if (!r) {
          showDiaryEmpty();
          return;
        }
        diaryBody.textContent = "오늘의 대화를 한 줄로 정리하고 있어요…";
        diaryBody.classList.remove("is-empty");
        requestChatNarrativeSummary(r, function (s) {
          if (s) {
            try {
              sessionStorage.setItem(STORAGE_CHAT_SUMMARY, s.slice(0, 2000));
            } catch (e2) {}
            diaryBody.textContent = s;
          } else {
            diaryBody.textContent = pack.chatSummaryFallback || summarizeDiaryForResult(r);
          }
          diaryBody.classList.remove("is-empty");
        });
      }

      var diary = getDiaryText();
      if (diary) {
        showNarrativeFromRaw(diary);
      } else if (window.DayflowDiaryStore && typeof DayflowDiaryStore.getLatestDiaryForToday === "function") {
        DayflowDiaryStore.getLatestDiaryForToday().then(function (row) {
          if (row && row.content) showNarrativeFromRaw(String(row.content));
          else showDiaryEmpty();
        });
      } else {
        showDiaryEmpty();
      }
    }

    var back = document.getElementById("resultBackBtn");
    if (back) {
      back.addEventListener("click", function () {
        window.location.href = "chat.html";
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
