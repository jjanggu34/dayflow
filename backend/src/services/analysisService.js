import { env } from "../config/env.js";
import { buildAnalysisPrompt } from "../prompts/analysisPrompt.js";

const clampScore = (value, fallback = 50) => {
  const n = Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.max(0, Math.min(100, n));
};

const fallbackAnalysis = (input) => ({
  summary: {
    emotionLabel: input.selectedEmotion.label,
    emotionScore: clampScore(input.selectedEmotion.score, 60),
    title: "오늘의 감정을 천천히 정리한 하루",
    description: "기록한 내용을 바탕으로 감정 흐름을 차분하게 정리했어요.",
    tags: [input.selectedEmotion.label, "기록", "회복"]
  },
  detailMetrics: {
    energy: clampScore(input.selectedEmotion.score, 60),
    stability: clampScore((input.selectedEmotion.score || 60) - 5, 55),
    focus: 60,
    positivity: clampScore((input.selectedEmotion.score || 60) + 2, 62)
  },
  insights: [
    "감정을 기록한 행위 자체가 정서 정리에 도움을 줬어요.",
    "핵심 경험을 짧게 표현해도 오늘의 흐름을 충분히 파악할 수 있어요.",
    "작은 루틴을 유지하면 내일의 안정감에도 긍정적이에요."
  ],
  environment: {
    temperature: 22,
    discomfortIndex: 58,
    luck: 4
  },
  diaryPreview: input.diaryText.slice(0, 120),
  tomorrowRecommendations: [
    "아침에 가장 중요한 일 1개를 먼저 시작하기",
    "저녁에 10분 감정 메모로 하루 마무리하기"
  ]
});

const normalizeAiResponse = (raw, input) => {
  const summary = raw?.summary || {};
  const detailMetrics = raw?.detailMetrics || {};

  return {
    summary: {
      emotionLabel: summary.emotionLabel || input.selectedEmotion.label,
      emotionScore: clampScore(summary.emotionScore, input.selectedEmotion.score),
      title: summary.title || "감정 흐름을 정리한 하루",
      description: summary.description || "오늘 기록을 바탕으로 감정의 핵심을 정리했어요.",
      tags: Array.isArray(summary.tags) && summary.tags.length > 0
        ? summary.tags.slice(0, 3)
        : [input.selectedEmotion.label, "기록", "일상"]
    },
    detailMetrics: {
      energy: clampScore(detailMetrics.energy, input.selectedEmotion.score),
      stability: clampScore(detailMetrics.stability, 60),
      focus: clampScore(detailMetrics.focus, 60),
      positivity: clampScore(detailMetrics.positivity, 60)
    },
    insights: Array.isArray(raw?.insights) && raw.insights.length >= 3
      ? raw.insights.slice(0, 3)
      : fallbackAnalysis(input).insights,
    environment: {
      temperature: 22,
      discomfortIndex: 58,
      luck: 4
    },
    diaryPreview: typeof raw?.diaryPreview === "string" && raw.diaryPreview.trim()
      ? raw.diaryPreview.slice(0, 200)
      : input.diaryText.slice(0, 120),
    tomorrowRecommendations:
      Array.isArray(raw?.tomorrowRecommendations) && raw.tomorrowRecommendations.length >= 2
        ? raw.tomorrowRecommendations.slice(0, 2)
        : fallbackAnalysis(input).tomorrowRecommendations
  };
};

const extractJson = (text) => {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("JSON parse failed");
    }
    return JSON.parse(match[0]);
  }
};

const isLikelyXaiKey = (key) => {
  if (!key || typeof key !== "string") return false;
  // Defensive check: common non-xAI key patterns should be warned.
  const blockedPrefixes = ["gsk_", "sk-ant-", "sk-proj-", "sk-"];
  return !blockedPrefixes.some((prefix) => key.startsWith(prefix));
};

const callGrok = async (input) => {
  const prompt = buildAnalysisPrompt(input);
  const endpoint = `${env.xaiBaseUrl}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("xai_request_timeout"), 15000);
  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.xaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.xaiModel,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a diary analysis assistant. Return only strict JSON without markdown."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      }),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Grok API timeout after 15s");
    }
    throw new Error(`Grok network failure: ${error.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Grok API error: status=${response.status}, model=${env.xaiModel}, body=${errorText}`
    );
  }

  const data = await response.json();
  const responseText = data?.choices?.[0]?.message?.content;
  if (!responseText || typeof responseText !== "string") {
    throw new Error("Grok response content is empty");
  }
  return responseText;
};

export const analyzeDiary = async (input) => {
  if (!env.xaiApiKey) {
    // eslint-disable-next-line no-console
    console.warn("[analysisService] XAI_API_KEY is missing, using fallback response");
    return fallbackAnalysis(input);
  }

  if (!isLikelyXaiKey(env.xaiApiKey)) {
    // eslint-disable-next-line no-console
    console.warn("[analysisService] XAI_API_KEY format looks suspicious for xAI");
    return fallbackAnalysis(input);
  }

  try {
    const responseText = await callGrok(input);
    const parsed = extractJson(responseText);
    return normalizeAiResponse(parsed, input);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[analysisService] Grok request or parse failed", error.message);
    return fallbackAnalysis(input);
  }
};
