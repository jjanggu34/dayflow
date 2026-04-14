import { EmotionOrb } from "../components/analysis/EmotionOrb.js";
import { InsightCard } from "../components/analysis/InsightCard.js";
import { TabBar } from "../components/common/TabBar.js";
import { appStore } from "../store/appStore.js";
import { requestAnalysis } from "../services/analysisService.js";
import { getAllEntries, saveLocalEntry } from "../services/localDbService.js";
import { createDiaryEntry } from "../services/diaryService.js";
import { navigate } from "../router/router.js";

const EMOTION_SCORE_MAP = {
  행복: { code: "happy", score: 82 },
  평온: { code: "calm", score: 72 },
  슬픔: { code: "sad", score: 34 },
  불안: { code: "anxious", score: 41 },
  분노: { code: "angry", score: 28 }
};

const buildExpressionStats = (samples) => {
  if (!Array.isArray(samples) || samples.length === 0) return null;

  const totals = samples.reduce((acc, sample) => {
    Object.entries(sample || {}).forEach(([key, value]) => {
      const num = Number(value);
      if (Number.isFinite(num)) acc[key] = (acc[key] || 0) + num;
    });
    return acc;
  }, {});

  const averaged = {};
  Object.entries(totals).forEach(([key, value]) => {
    averaged[key] = Number(((value / samples.length) * 100).toFixed(1));
  });
  return averaged;
};

export function AnalysisPage(state) {
  const result = state.analysisResult;
  return `
    <section class="page">
      <div class="app-card">
        <h2>오늘의 분석</h2>
        ${EmotionOrb(state.selectedEmotion)}
        ${
          result
            ? `
          ${InsightCard(
            `<strong>${result.summary?.title || "오늘의 분석"}</strong><br>${result.summary?.description || ""}`
          )}
          ${result.insights.map((insight) => InsightCard(insight)).join("")}
          <button class="btn btn-secondary" id="toCalendar">캘린더 보기</button>
        `
            : `<button class="btn btn-primary" id="runAnalysis">분석 시작</button>`
        }
      </div>
      ${TabBar("S5")}
    </section>
  `;
}

export function bindAnalysisEvents() {
  document.getElementById("runAnalysis")?.addEventListener("click", async () => {
    const state = appStore.getState();
    const emotionMeta = EMOTION_SCORE_MAP[state.selectedEmotion] || {
      code: "unknown",
      score: 60
    };

    const payload = {
      selectedEmotion: {
        code: emotionMeta.code,
        label: state.selectedEmotion || "감정",
        score: emotionMeta.score
      },
      recordMethod: state.recordMethod || "chat",
      diaryText: state.diaryText || "",
      expressionStats: buildExpressionStats(state.expressionSamples),
      date: new Date().toISOString().slice(0, 10)
    };
    await saveLocalEntry(payload);
    const entries = await getAllEntries();
    createDiaryEntry(payload).catch(() => null);
    const analysis = await requestAnalysis(payload);
    appStore.setState({
      analysisResult: analysis,
      calendarEntries: entries
    });
  });

  document.getElementById("toCalendar")?.addEventListener("click", () => navigate("S6"));
}
