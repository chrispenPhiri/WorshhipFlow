const AI_SOURCE_STORAGE = "wf-ai-source";

const KEY_STORAGE_MAP: Record<string, string> = {
  openai:     "wf-openai-key",
  gemini:     "wf-gemini-key",
  openrouter: "wf-openrouter-key",
  deepseek:   "wf-deepseek-key",
  groq:       "wf-groq-key",
};

const MODEL_STORAGE_MAP: Record<string, string> = {
  openai:     "wf-openai-model",
  gemini:     "wf-gemini-model",
  openrouter: "wf-openrouter-model",
  deepseek:   "wf-deepseek-model",
  groq:       "wf-groq-model",
};

const DEFAULT_MODEL_MAP: Record<string, string> = {
  openai:     "gpt-4o",
  gemini:     "gemini-2.0-flash",
  openrouter: "openai/gpt-4o",
  deepseek:   "deepseek-chat",
  groq:       "llama-3.3-70b-versatile",
};

export function getAiHeaders(): Record<string, string> {
  // "replit" was a legacy option that billed the app-owner — treat it as openai fallback
  const rawSource = localStorage.getItem(AI_SOURCE_STORAGE) ?? "openai";
  const source = rawSource === "replit" ? "openai" : rawSource;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = localStorage.getItem(KEY_STORAGE_MAP[source] ?? "wf-openai-key")?.trim();
  if (key) {
    headers["X-AI-Key"] = key;
    if (source === "openai") headers["X-OpenAI-Key"] = key;
    if (source !== "openai") headers["X-AI-Provider"] = source;
  }
  const model = localStorage.getItem(MODEL_STORAGE_MAP[source] ?? "") ?? DEFAULT_MODEL_MAP[source];
  if (model) headers["X-AI-Model"] = model;

  // Image generation source — defaults to Pollinations (free, no API key required).
  // Users can switch to "openai" in Settings to use DALL-E with their own key.
  const imgSource = localStorage.getItem("wf-image-source") ?? "pollinations";
  headers["X-Image-Source"] = imgSource;
  const imgModel = localStorage.getItem("wf-image-model") ?? "flux";
  headers["X-Image-Model"] = imgModel;

  return headers;
}
