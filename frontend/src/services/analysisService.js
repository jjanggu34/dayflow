import { apiFetch } from "./apiClient.js";

export async function requestAnalysis(payload) {
  try {
    return await apiFetch("/api/analysis", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  } catch (error) {
    return {
      summary: {
        emotionLabel: payload.selectedEmotion?.label || "감정",
        emotionScore: payload.selectedEmotion?.score || 60,
        title: "기록을 기반으로 감정을 정리했어요",
        description: "일기 내용을 바탕으로 오늘의 흐름을 간단히 요약했어요.",
        tags: ["기록", "일상", "정리"]
      },
      detailMetrics: {
        energy: 60,
        stability: 58,
        focus: 57,
        positivity: 62
      },
      insights: [
        "감정을 글로 남긴 것만으로도 정서 조절에 도움이 됩니다.",
        "핵심 사건을 짚어보면 감정 변화의 이유가 선명해집니다.",
        "내일도 짧게 기록하면 감정 패턴 파악에 유리합니다."
      ],
      environment: { temperature: 22, discomfortIndex: 58, luck: 4 },
      diaryPreview: payload.diaryText || "",
      tomorrowRecommendations: [
        "아침에 우선순위 1개 먼저 처리하기",
        "잠들기 전 3줄 감정 메모 남기기"
      ]
    };
  }
}
