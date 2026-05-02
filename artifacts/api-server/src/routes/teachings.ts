import { Router } from "express";
import OpenAI from "openai";

/**
 * AI-assisted teaching generation.
 *
 * POST /api/teachings/generate { topic: string, category: string }
 *   → returns a structured teaching object (no id; client persists to localStorage).
 *
 * Uses the Replit AI Integrations OpenAI proxy (no user-supplied API key needed
 * — the AI_INTEGRATIONS_OPENAI_* env vars are auto-provisioned).
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

router.post("/generate", async (req, res) => {
  const baseUrl = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  if (!baseUrl || !apiKey) {
    return res.status(503).json({
      error: "AI generation is not configured on the server. Add a teaching manually instead.",
    });
  }

  const body = req.body as { topic?: unknown; category?: unknown } | undefined;
  const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
  const category: Category = isCategory(body?.category) ? body.category : "Adults";
  if (!topic) {
    return res.status(400).json({ error: "Provide a topic for the teaching." });
  }
  if (topic.length > 200) {
    return res.status(400).json({ error: "Topic is too long (max 200 characters)." });
  }

  const client = new OpenAI({ baseURL: baseUrl, apiKey });

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

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "Teaching",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              category: { type: "string", enum: [category] },
              theme: { type: "string" },
              keyVerse: {
                type: "object",
                additionalProperties: false,
                properties: {
                  reference: { type: "string" },
                  text: { type: "string" },
                },
                required: ["reference", "text"],
              },
              summary: { type: "string" },
              points: {
                type: "array",
                minItems: 3,
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    heading: { type: "string" },
                    body: { type: "string" },
                  },
                  required: ["heading", "body"],
                },
              },
              discussionQuestions: {
                type: "array",
                minItems: 2,
                maxItems: 5,
                items: { type: "string" },
              },
              activity: { type: "string" },
              prayer: { type: "string" },
              memoryVerse: { type: ["string", "null"] },
            },
            required: [
              "title", "category", "theme", "keyVerse",
              "summary", "points", "discussionQuestions",
              "activity", "prayer", "memoryVerse",
            ],
          },
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      req.log.warn({ topic, category }, "OpenAI returned empty content");
      return res.status(502).json({ error: "AI returned an empty response. Try again." });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      req.log.warn({ err, raw: raw.slice(0, 200) }, "OpenAI returned non-JSON content");
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
    return res.status(502).json({
      error: `AI generation failed: ${message}`,
    });
  }
});

export default router;
