import "dotenv/config";

export const config = {
  port: process.env.PORT || 3001,
  llm: {
    apiKey: process.env.LLM_API_KEY || "",
    baseUrl: process.env.LLM_BASE_URL || "",
    model: process.env.LLM_MODEL || "",
  },
};

export function isLLMConfigured(): boolean {
  const { apiKey, baseUrl, model } = config.llm;
  return Boolean(apiKey && baseUrl && model);
}
