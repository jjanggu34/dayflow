import { analyzeDiary } from "../services/analysisService.js";

export const postAnalysis = async (req, res, next) => {
  try {
    const result = await analyzeDiary(req.validatedBody);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};
