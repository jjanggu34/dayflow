import { z } from "zod";

const selectedEmotionSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  score: z.number().int().min(0).max(100)
});

const expressionStatsSchema = z
  .object({
    happiness: z.number().min(0).max(100).optional(),
    sadness: z.number().min(0).max(100).optional(),
    anger: z.number().min(0).max(100).optional(),
    neutral: z.number().min(0).max(100).optional()
  })
  .passthrough();

export const analysisRequestSchema = z.object({
  selectedEmotion: selectedEmotionSchema,
  recordMethod: z.enum(["chat", "video", "text", "voice", "manual"]),
  diaryText: z.string().min(1).max(5000),
  expressionStats: expressionStatsSchema.nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
