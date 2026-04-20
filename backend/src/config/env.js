import dotenv from "dotenv";

dotenv.config();

const requiredEnv = ["XAI_API_KEY"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.warn(`[env] Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  xaiApiKey: process.env.XAI_API_KEY || "",
  xaiModel: process.env.XAI_MODEL || "grok-2-latest",
  xaiBaseUrl: process.env.XAI_BASE_URL || "https://api.x.ai/v1",
  allowedOrigin: process.env.ALLOWED_ORIGIN || "http://localhost:5173"
};