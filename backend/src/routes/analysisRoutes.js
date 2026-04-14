import { Router } from "express";
import { postAnalysis } from "../controllers/analysisController.js";
import { validate } from "../middlewares/validate.js";
import { analysisRequestSchema } from "../schemas/analysisSchema.js";

const analysisRouter = Router();

analysisRouter.post("/analysis", validate(analysisRequestSchema), postAnalysis);

export default analysisRouter;
