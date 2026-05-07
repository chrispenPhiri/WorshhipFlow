import { Router } from "express";
import OpenAI from "openai";

/**
 * AI-assisted teaching generation.
 *
 * POST /api/teachings/generate { topic: string, category: string }
 *   → returns a structured teaching object (no id; client persists to localStorage).
 *
 * Uses the user's own AI key/provider forwarded via request headers
 * (X-AI-Key, X-AI-Provider, X-AI-Model) — the same pattern as /api/ai/*.
 */

const router = Router();

const ALLOWED_CATEGORIES = [
  "Sunday School", "Youth", "Mothers", "Fathers", "Adults",
  "Happiness", "Funeral", "Baptism", "Holy Communion", "Marriage", "Healing",
] as const;

type Category = (typeof ALLOWED_CATEGORIES)[number];

function isCategory(x: unknown): x is Category {
  return typeof x === "string" && (ALLOWED_CATEGORIES as readonly string[]).includes(x);
}

type AiProvider = "openai" | "gemini" | "openrouter" | "deepseek" | "groq";

const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai:     "gpt-4o",
  gemini:     "gemini-2.0-flash",
  openrouter: "openai/gpt-4o",
  deepseek:   "deepseek-chat",
  groq:       "llama-3.3-70b-versatile",
};

router.post("/generate", async (req, res) => {
  /* ── Resolve AI client from user-supplied headers ── */
  const provider = ((req.headers["x-ai-provider"] as string | undefined)?.trim() ?? "openai") as AiProvider;
  const rawKey   = (req.headers["x-ai-key"] ?? req.headers["x-openai-key"]) as string | undefined;
  const modelHdr = (req.headers["x-ai-model"] as string | undefined)?.trim();
  const key      = rawKey?.trim();

  if (!key) {
    return res.status(402).json({
      error: "No AI provider configured. Choose an AI provider in Settings → AI Features.",
    });
  }

  const model = modelHdr ?? DEFAULT_MODELS[provider] ?? "gpt-4o";

  let client: OpenAI;
  switch (provider) {
    case "gemini":
      client = new OpenAI({ apiKey: key, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" });
      break;
    case "openrouter":
      client = new OpenAI({
        apiKey: key,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: { "HTTP-Referer": "https://phiriworshipflow.replit.app", "X-Title": "Phiri WorshipFlow" },
      });
      break;
    case "deepseek":
      client = new OpenAI({ apiKey: key, baseURL: "https://api.deepseek.com" });
      break;
    case "groq":
      client = new OpenAI({ apiKey: key, baseURL: "https://api.groq.com/openai/v1" });
      break;
    default: // openai
      client = new OpenAI({ apiKey: key });
  }

  /* ── Validate request body ── */
  const body = req.body as { topic?: unknown; category?: unknown } | undefined;
  const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
  const category: Category = isCategory(body?.category) ? body.category : "Adults";
  if (!topic) {
    return res.status(400).json({ error: "Provide a topic for the teaching." });
  }
  if (topic.length > 200) {
    return res.status(400).json({ error: "Topic is too long (max 200 characters)." });
  }

  /* ── Prompts ── */
  const systemPrompt = [
    "You are a careful, doctrinally orthodox Protestant Christian Bible teacher writing a complete short lesson for a local church.",
    "You write in plain, warm, pastoral English — no jargon. You quote the King James Version (KJV) for any verse text.",
    "You produce ONLY a single JSON object that conforms to the schema you are given. No prose, no markdown, no comments.",
    "The lesson must be Scripture-grounded, Christ-centered, edifying, and respectful of all denominations within historic Protestant orthodoxy.",
    "Avoid politics, sectarian distinctives, prosperity-gospel, end-times speculation, and anything novel or controversial.",
  ].join(" ");

  const userPrompt = [
    `Write a complete teaching for the category "${category}" on the topic: "${topic}".`,
    "",
    "The lesson must include:",
    "- title: a short engaging title",
    "- category: must be exactly the value you were given",
    "- theme: a single short word or two-word topic (e.g. Faith, Prayer, Joy, Comfort)",
    "- keyVerse: { reference: KJV reference like 'John 3:16', text: KJV verse text }",
    "- summary: 1-2 plain-English sentences",
    "- points: 3 teaching points, each { heading, body }. Each body 1-3 sentences.",
    "- discussionQuestions: 3 thoughtful questions",
    "- activity: one practical group/individual activity (1-2 sentences)",
    "- prayer: a short closing prayer (2-4 sentences)",
    "- memoryVerse: optional short reference (e.g. 'Psalm 23:1') if there is a clear one; otherwise omit",
    "",
    "Tailor tone to the category:",
    "- Sunday School: simple, vivid, child-friendly",
    "- Youth: direct, real-life, no platitudes",
    "- Mothers/Fathers: warm, family-life focused",
    "- Adults: substantive, application-oriented",
    "- Happiness: joyful and rooted in the Lord",
    "- Funeral: tender, hope-filled, gospel-centered",
    "- Baptism: covenant and obedience focused",
    "- Holy Communion: reverent, remembrance focused",
    "- Marriage: gospel picture of Christ and the church",
    "- Healing: dependent on God, honest about suffering, hopeful",
  ].join("\n");

  /* ── JSON schema (OpenAI / Gemini support strict mode; others use json_object) ── */
  const supportsJsonSchema = provider === "openai" || provider === "gemini";

  const responseFormat: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming["response_format"] =
    supportsJsonSchema
      ? {
          type: "json_schema",
          json_schema: {
            name: "Teaching",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title:               { type: "string" },
                category:            { type: "string", enum: [category] },
                theme:               { type: "string" },
                keyVerse: {
                  type: "object",
                  additionalProperties: false,
                  properties: { reference: { type: "string" }, text: { type: "string" } },
                  required: ["reference", "text"],
                },
                summary:             { type: "string" },
                points: {
                  type: "array", minItems: 3, maxItems: 5,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: { heading: { type: "string" }, body: { type: "string" } },
                    required: ["heading", "body"],
                  },
                },
                discussionQuestions: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
                activity:            { type: "string" },
                prayer:              { type: "string" },
                memoryVerse:         { type: ["string", "null"] },
              },
              required: [
                "title", "category", "theme", "keyVerse",
                "summary", "points", "discussionQuestions",
                "activity", "prayer", "memoryVerse",
              ],
            },
          },
        }
      : { type: "json_object" };

  /* ── Generate ── */
  try {
    const completion = await client.chat.completions.create({
      model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
      response_format: responseFormat,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      req.log.warn({ topic, category, provider }, "AI returned empty content");
      return res.status(502).json({ error: "AI returned an empty response. Try again." });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      req.log.warn({ err, raw: raw.slice(0, 200) }, "AI returned non-JSON content");
      return res.status(502).json({ error: "AI returned malformed content. Try again." });
    }

    // Normalise: drop null memoryVerse so the client treats it as undefined.
    const teaching = parsed as Record<string, unknown>;
    if (teaching["memoryVerse"] === null) {
      delete teaching["memoryVerse"];
    }
    return res.json(teaching);
  } catch (err) {
    req.log.error({ err }, "Teaching generation failed");
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `AI generation failed: ${message}` });
  }
});

export default router;
