import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import healthRouter from "./routes/healthRoutes.js";
import analysisRouter from "./routes/analysisRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: env.allowedOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));

app.use("/api", healthRouter);
app.use("/api", analysisRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(errorHandler);

export default app;
