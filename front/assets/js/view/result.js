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
      tomorrowRecommendations: [
        { title: "중요한 일 선제 처리", body: "집중력이 높은 흐름을 살려 어려운 일을 오전에 먼저 끝내 보세요." },
        { title: "짧은 회복 루틴 유지", body: "성과를 이어가려면 중간에 10분 정도 가볍게 쉬어 리듬을 지켜 주세요." },
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
      tomorrowRecommendations: [
        { title: "핵심 우선순위 1개", body: "가장 중요한 업무 하나를 먼저 정하고 해당 시간대를 고정해 보세요." },
        { title: "지출·에너지 균형 점검", body: "불필요한 소비를 줄이고, 휴식 시간을 미리 넣어 안정감을 유지해 보세요." },
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
      tomorrowRecommendations: [
        { title: "작은 목표 2개 설정", body: "부담 없는 할 일을 2개만 정해 완료 경험을 먼저 만들어 보세요." },
        { title: "생활 루틴 한 가지 개선", body: "기상·식사·정리 중 한 가지를 고정해 내일 컨디션을 안정시켜 보세요." },
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
      tomorrowRecommendations: [
        { title: "할 일 최소 단위로 나누기", body: "큰 목표 대신 10~15분 안에 끝낼 수 있는 단위부터 시작해 보세요." },
        { title: "회복 우선 일정 잡기", body: "산책, 스트레칭, 수면 준비를 일정에 먼저 넣어 체력을 회복해 주세요." },
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
      tomorrowRecommendations: [
        { title: "생존 루틴 먼저 확보", body: "수면·식사·수분 같은 기본 리듬부터 지키는 것을 내일 목표로 잡아 보세요." },
        { title: "도움 요청 한 번 시도", body: "믿을 수 있는 사람에게 현재 상태를 짧게 공유하고 지원을 받아 보세요." },
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
    if (!window.DayflowApiKey || (!DayflowApiKey.has() && !DayflowApiKey.usesServerProxy()) || !window.DayflowChatAgent || typeof DayflowChatAgent.sendMessages !== "function") {
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

  function getInsightsFallbackText(pack) {
    return (pack && pack.insights && pack.insights.length ? pack.insights : ["오늘의 흐름을 바탕으로 천천히 정리해 보세요."]).join(" ");
  }

  function requestPersonalizedInsight(type, pack, raw, onDone) {
    if (typeof onDone !== "function") onDone = function () {};
    var t = String(raw || "").trim();
    if (t.length < 12) {
      onDone("");
      return;
    }
    if (!window.DayflowApiKey || (!DayflowApiKey.has() && !DayflowApiKey.usesServerProxy()) || !window.DayflowChatAgent || typeof DayflowChatAgent.sendMessages !== "function") {
      onDone("");
      return;
    }
    DayflowChatAgent.sendMessages({
      apiKey: DayflowApiKey.get(),
      system:
        "당신은 감정 일기 앱의 코치입니다. 사용자의 감정 상태와 일기 대화를 바탕으로, " +
        "실행 가능한 맞춤 조언을 한국어 존댓말 2~3문장으로 작성하세요. " +
        "반드시 대화 내용에 근거하고, 과장 없이 구체적인 다음 행동 1~2가지를 제안하세요. " +
        "글머리표/제목 없이 문단 한 덩어리로만 답하세요.",
      messages: [
        {
          role: "user",
          content:
            "[감정 타입] " +
            String(type || "good") +
            "\n[현재 기분 라벨] " +
            String((pack && pack.moodLabel) || "") +
            "\n[오늘 점수] " +
            String((pack && pack.total) || 0) +
            "\n[일기 대화]\n" +
            t.slice(0, 12000),
        },
      ],
    })
      .then(function (reply) {
        onDone(String(reply || "").trim());
      })
      .catch(function () {
        onDone("");
      });
  }

  function requestTomorrowRecommendations(type, pack, raw, onDone) {
    if (typeof onDone !== "function") onDone = function () {};
    var t = String(raw || "").trim();
    if (t.length < 12) {
      onDone([]);
      return;
    }
    if (!window.DayflowApiKey || (!DayflowApiKey.has() && !DayflowApiKey.usesServerProxy()) || !window.DayflowChatAgent || typeof DayflowChatAgent.sendMessages !== "function") {
      onDone([]);
      return;
    }
    DayflowChatAgent.sendMessages({
      apiKey: DayflowApiKey.get(),
      system:
        "당신은 감정 일기 앱 코치입니다. 대화와 감정 상태를 바탕으로 내일 실천할 추천 2가지를 만드세요. " +
        "각 줄 형식은 '제목 | 설명'으로만 작성하고 총 2줄만 출력하세요. 번호, 따옴표, 머리말은 금지합니다.",
      messages: [
        {
          role: "user",
          content:
            "[감정 타입] " +
            String(type || "good") +
            "\n[현재 기분 라벨] " +
            String((pack && pack.moodLabel) || "") +
            "\n[오늘 점수] " +
            String((pack && pack.total) || 0) +
            "\n[일기 대화]\n" +
            t.slice(0, 12000),
        },
      ],
    })
      .then(function (reply) {
        var lines = String(reply || "")
          .split(/\n+/)
          .map(function (v) {
            return v.trim();
          })
          .filter(Boolean);
        var out = [];
        for (var i = 0; i < lines.length && out.length < 2; i++) {
          var line = lines[i].replace(/^\d+\s*[\.\)]\s*/, "");
          var parts = line.split("|");
          if (parts.length < 2) continue;
          var title = parts[0].trim();
          var body = parts.slice(1).join("|").trim();
          if (!title || !body) continue;
          out.push({ title: title, body: body });
        }
        onDone(out);
      })
      .catch(function () {
        onDone([]);
      });
  }

  function extractJsonObject(text) {
    var s = String(text || "").trim();
    if (!s) return null;
    var m = s.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch (e) {
      return null;
    }
  }

  function clampMetricValue(v) {
    return Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
  }

  function normalizeDynamicPack(basePack, rawObj) {
    var obj = rawObj || {};
    var out = {
      headline: String(obj.headline || basePack.headline || "").trim() || basePack.headline,
      subline: String(obj.subline || basePack.subline || "").trim() || basePack.subline,
      moodLabel: String(obj.moodLabel || basePack.moodLabel || "").trim() || basePack.moodLabel,
      total: clampMetricValue(obj.total != null ? obj.total : basePack.total),
      tags: Array.isArray(obj.tags)
        ? obj.tags
            .map(function (v) {
              return String(v || "").trim();
            })
            .filter(Boolean)
            .slice(0, 2)
        : basePack.tags,
      metrics: Array.isArray(obj.metrics)
        ? obj.metrics
            .map(function (m) {
              return {
                name: String((m && m.name) || "").trim(),
                value: clampMetricValue(m && m.value),
              };
            })
            .filter(function (m) {
              return !!m.name;
            })
            .slice(0, 4)
        : basePack.metrics,
      insights: Array.isArray(obj.insights)
        ? obj.insights
            .map(function (v) {
              return String(v || "").trim();
            })
            .filter(Boolean)
            .slice(0, 2)
        : basePack.insights,
      tomorrowRecommendations: Array.isArray(obj.tomorrowRecommendations)
        ? obj.tomorrowRecommendations
            .map(function (r) {
              return {
                title: String((r && r.title) || "").trim(),
                body: String((r && r.body) || "").trim(),
              };
            })
            .filter(function (r) {
              return r.title && r.body;
            })
            .slice(0, 2)
        : basePack.tomorrowRecommendations,
      chatSummaryFallback: basePack.chatSummaryFallback,
    };
    if (!out.tags || !out.tags.length) out.tags = basePack.tags;
    if (!out.metrics || out.metrics.length < 4) out.metrics = basePack.metrics;
    if (!out.insights || !out.insights.length) out.insights = basePack.insights;
    if (!out.tomorrowRecommendations || out.tomorrowRecommendations.length < 2) {
      out.tomorrowRecommendations = basePack.tomorrowRecommendations;
    }
    return out;
  }

  function requestDynamicPack(type, basePack, raw, onDone) {
    if (typeof onDone !== "function") onDone = function () {};
    var t = String(raw || "").trim();
    if (t.length < 12) {
      onDone(null);
      return;
    }
    if (!window.DayflowApiKey || (!DayflowApiKey.has() && !DayflowApiKey.usesServerProxy()) || !window.DayflowChatAgent || typeof DayflowChatAgent.sendMessages !== "function") {
      onDone(null);
      return;
    }
    DayflowChatAgent.sendMessages({
      apiKey: DayflowApiKey.get(),
      system:
        "당신은 감정 일기 앱 분석 엔진입니다. 반드시 JSON 객체만 출력하세요. 설명 문장/마크다운 금지. " +
        "스키마: {headline,subline,moodLabel,total,tags[2],metrics[4:{name,value}],insights[2],tomorrowRecommendations[2:{title,body}]}. " +
        "모든 문구는 한국어 존댓말, total/metrics.value는 0~100 정수.",
      messages: [
        {
          role: "user",
          content:
            "[감정 타입] " +
            String(type || "good") +
            "\n[기본 데이터]\n" +
            JSON.stringify({
              headline: basePack.headline,
              subline: basePack.subline,
              moodLabel: basePack.moodLabel,
              total: basePack.total,
              tags: basePack.tags,
              metrics: basePack.metrics,
              insights: basePack.insights,
              tomorrowRecommendations: basePack.tomorrowRecommendations,
            }) +
            "\n[대화 원문]\n" +
            t.slice(0, 12000),
        },
      ],
    })
      .then(function (reply) {
        var parsed = extractJsonObject(reply);
        onDone(parsed ? normalizeDynamicPack(basePack, parsed) : null);
      })
      .catch(function () {
        onDone(null);
      });
  }

  function renderTomorrowRecommendations(items) {
    var t1 = document.getElementById("resultReco1Title");
    var b1 = document.getElementById("resultReco1Body");
    var t2 = document.getElementById("resultReco2Title");
    var b2 = document.getElementById("resultReco2Body");
    if (!t1 || !b1 || !t2 || !b2) return;
    var safe = items && items.length ? items : [];
    var r1 = safe[0] || { title: "", body: "" };
    var r2 = safe[1] || { title: "", body: "" };
    t1.textContent = r1.title || "";
    b1.textContent = r1.body || "";
    t2.textContent = r2.title || "";
    b2.textContent = r2.body || "";
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
    var joined = (lines || []).join(" ").trim();
    if (!joined) return;
    if (listEl.tagName && listEl.tagName.toLowerCase() === "p") {
      listEl.textContent = joined;
      return;
    }
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
    var Dflow = window.DayflowEmotionChat;
    if (Dflow) {
      try {
        var em0 = sessionStorage.getItem(Dflow.STORAGE_EMOTION_KEY);
        if (!em0 || !/^(best|good|normal|bad|worst)$/.test(em0)) {
          window.location.replace(Dflow.urlChatFlow("emotion"));
          return;
        }
        if (sessionStorage.getItem(Dflow.STORAGE_CHAT_FLOW_DONE) !== "1") {
          window.location.replace(Dflow.urlChatFlow("chat"));
          return;
        }
      } catch (eFlow) {
        window.location.replace(Dflow.urlChatFlow("emotion"));
        return;
      }
    }

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

    function applyPackToView(viewPack) {
      if (headline) headline.textContent = viewPack.headline;
      if (subline) subline.textContent = viewPack.subline;
      if (totalScore) totalScore.textContent = String(viewPack.total);
      if (moodLabel) moodLabel.textContent = viewPack.moodLabel;
      if (tags) renderTags(tags, viewPack.tags);
      if (metricsList) renderMetrics(metricsList, viewPack.metrics);
      applyGaugeScore(viewPack.total);
      if (insightsList) {
        insightsList.textContent = getInsightsFallbackText(viewPack);
      }
      renderTomorrowRecommendations(viewPack.tomorrowRecommendations || []);
    }

    applyPackToView(pack);
    if (insightsList) {
      var fallbackInsightText = getInsightsFallbackText(pack);
      insightsList.textContent = fallbackInsightText;
      function showPersonalizedInsightFromRaw(raw) {
        var r = String(raw || "").trim();
        if (!r) {
          insightsList.textContent = fallbackInsightText;
          return;
        }
        insightsList.textContent = "오늘 감정에 맞는 조언을 정리하고 있어요…";
        requestPersonalizedInsight(type, pack, r, function (advice) {
          insightsList.textContent = advice || fallbackInsightText;
        });
      }
      var insightsDiary = getDiaryText();
      if (insightsDiary) {
        showPersonalizedInsightFromRaw(insightsDiary);
      } else if (window.DayflowSupabaseStore && typeof DayflowSupabaseStore.getLatestDiaryForToday === "function") {
        DayflowSupabaseStore.getLatestDiaryForToday().then(function (row) {
          if (row && row.content) showPersonalizedInsightFromRaw(String(row.content));
          else insightsList.textContent = fallbackInsightText;
        });
      } else {
        insightsList.textContent = fallbackInsightText;
      }
    }

    var fallbackRecs = pack.tomorrowRecommendations || [];
    renderTomorrowRecommendations(fallbackRecs);
    function showTomorrowRecommendationsFromRaw(raw) {
      var r = String(raw || "").trim();
      if (!r) {
        renderTomorrowRecommendations(fallbackRecs);
        return;
      }
      requestTomorrowRecommendations(type, pack, r, function (items) {
        renderTomorrowRecommendations(items && items.length === 2 ? items : fallbackRecs);
      });
    }
    var recDiary = getDiaryText();
    if (recDiary) {
      showTomorrowRecommendationsFromRaw(recDiary);
    } else if (window.DayflowSupabaseStore && typeof DayflowSupabaseStore.getLatestDiaryForToday === "function") {
      DayflowSupabaseStore.getLatestDiaryForToday().then(function (row) {
        if (row && row.content) showTomorrowRecommendationsFromRaw(String(row.content));
        else renderTomorrowRecommendations(fallbackRecs);
      });
    }

    function hydrateDynamicPackFromRaw(raw) {
      var r = String(raw || "").trim();
      if (!r) return;
      requestDynamicPack(type, pack, r, function (dynamicPack) {
        if (!dynamicPack) return;
        pack = dynamicPack;
        applyPackToView(pack);
      });
    }
    if (recDiary) {
      hydrateDynamicPackFromRaw(recDiary);
    } else if (window.DayflowSupabaseStore && typeof DayflowSupabaseStore.getLatestDiaryForToday === "function") {
      DayflowSupabaseStore.getLatestDiaryForToday().then(function (row) {
        if (row && row.content) hydrateDynamicPackFromRaw(String(row.content));
      });
    }

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
      } else if (window.DayflowSupabaseStore && typeof DayflowSupabaseStore.getLatestDiaryForToday === "function") {
        DayflowSupabaseStore.getLatestDiaryForToday().then(function (row) {
          if (row && row.content) showNarrativeFromRaw(String(row.content));
          else showDiaryEmpty();
        });
      } else {
        showDiaryEmpty();
      }
    }

    var homeFoot = document.querySelector(".result-footer__home");
    if (homeFoot && window.DayflowEmotionChat && typeof DayflowEmotionChat.urlChatFlow === "function") {
      homeFoot.setAttribute("href", DayflowEmotionChat.urlChatFlow("emotion"));
    }

    var back = document.getElementById("resultBackBtn");
    if (back) {
      back.addEventListener("click", function () {
        window.location.href =
          window.DayflowEmotionChat && typeof DayflowEmotionChat.urlChatFlow === "function"
            ? DayflowEmotionChat.urlChatFlow("chat")
            : "chat.html";
      });
    }

    var homeBtn = document.getElementById("resultAdviceBtn");
    if (homeBtn) {
      homeBtn.addEventListener("click", function () {
        window.location.href = "/main";
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
