export const buildAnalysisPrompt = (input) => {
  return [
    "당신은 감정일기 분석 도우미입니다.",
    "과도한 치료적 표현, 진단, 단정적 판단을 금지합니다.",
    "짧고 따뜻하지만 과장되지 않은 문장으로 작성하세요.",
    "반드시 JSON만 출력하고, 코드블록/설명/추가 텍스트를 절대 포함하지 마세요.",
    "응답 스키마는 아래와 정확히 일치해야 합니다:",
    "{",
    '  "summary": {',
    '    "emotionLabel": "string",',
    '    "emotionScore": 0,',
    '    "title": "string",',
    '    "description": "string",',
    '    "tags": ["string", "string", "string"]',
    "  },",
    '  "detailMetrics": { "energy": 0, "stability": 0, "focus": 0, "positivity": 0 },',
    '  "insights": ["string", "string", "string"],',
    '  "diaryPreview": "string",',
    '  "tomorrowRecommendations": ["string", "string"]',
    "}",
    "모든 점수는 0~100 정수로 작성하세요.",
    "insights는 정확히 3개, tomorrowRecommendations는 정확히 2개로 작성하세요.",
    "입력 데이터:",
    JSON.stringify(input, null, 2)
  ].join("\n");
};
