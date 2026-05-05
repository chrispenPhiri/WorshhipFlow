import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

function sseHeaders(res: import("express").Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

async function streamCompletion(
  res: import("express").Response,
  systemPrompt: string,
  userMessage: string
) {
  sseHeaders(res);
  const stream = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    stream: true,
  });
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}

/* ── Ask a Prophet ─────────────────────────────────────────── */
router.post("/prophet", async (req, res) => {
  const { question, history } = req.body as {
    question: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };
  if (!question?.trim()) {
    res.status(400).json({ error: "question is required" });
    return;
  }
  sseHeaders(res);
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    {
      role: "system",
      content: `You are "The Prophet", a wise and warm theological assistant for a church worship application called Phiri WorshipFlow.
You are deeply knowledgeable in Scripture, church history, patristics, Reformed theology, Catholic tradition, Pentecostal spirituality, and biblical hermeneutics.
When answering questions about Bible passages, you always:
- Give historical and cultural context
- Explain the original Hebrew/Greek meaning of key words when relevant
- Reference cross-passages that illuminate the text
- Connect the passage to the broader redemptive narrative
- Apply the truth to modern Christian life
Be warm, pastoral, and accessible — never condescending. Keep answers focused and well-structured.`,
    },
    ...(history ?? []),
    { role: "user", content: question },
  ];
  const stream = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 8192,
    messages,
    stream: true,
  });
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

/* ── AI Chapter Summary ─────────────────────────────────────── */
router.post("/summary", async (req, res) => {
  const { book, chapter, text } = req.body as {
    book: string;
    chapter: number | string;
    text?: string;
  };
  if (!book) {
    res.status(400).json({ error: "book is required" });
    return;
  }
  const userMsg = text
    ? `Summarise ${book} chapter ${chapter}. Here is the text:\n\n${text}`
    : `Summarise ${book} chapter ${chapter} of the Bible.`;
  await streamCompletion(
    res,
    `You are a biblical scholar creating concise chapter summaries for church worship leaders.
Respond with exactly 3 bullet points (use • character), each 1-2 sentences long, covering:
1. The main theme or event
2. A key theological insight
3. The practical takeaway for believers today
Keep the language accessible but theologically accurate. Do not add headings or preamble — just the 3 bullets.`,
    userMsg
  );
});

/* ── Context Lens ───────────────────────────────────────────── */
router.post("/context-lens", async (req, res) => {
  const { passage, text } = req.body as { passage: string; text?: string };
  if (!passage) {
    res.status(400).json({ error: "passage is required" });
    return;
  }
  const userMsg = text
    ? `Explain this passage in simple language: "${passage}"\n\nText: ${text}`
    : `Explain the Bible passage "${passage}" in simple language.`;
  await streamCompletion(
    res,
    `You are a gifted Bible teacher who specialises in making Scripture understandable to everyone — children, new believers, and people encountering the Bible for the first time.
When explaining a passage:
- Use everyday modern language (no jargon)
- Use a simple analogy or story to illustrate the main idea
- Explain any archaic words in plain English
- Keep it to 3-4 short paragraphs maximum
- End with one sentence saying why this matters today
Never be condescending. Be warm, clear, and encouraging.`,
    userMsg
  );
});

/* ── Text Enhancement / Correction ─────────────────────────── */
router.post("/enhance-text", async (req, res) => {
  const { text } = req.body as { text: string };
  if (!text?.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  await streamCompletion(
    res,
    `You are a professional proofreader and editor for a church worship presentation app.
When given worship text for a church presentation slide, you:
- Fix spelling, grammar and punctuation mistakes
- Improve clarity and flow for spoken worship contexts
- Capitalise proper nouns (God, Jesus, Holy Spirit, Lord, Father, etc.)
- Preserve the original meaning, tone and intent faithfully
- Keep line breaks if they are intentional (for poetry/lyrics)
- Return ONLY the corrected text, with no commentary, explanation, or surrounding quotes`,
    `Please correct and improve this worship text:\n\n${text}`
  );
});

/* ── Custom AI Image Generation ─────────────────────────────── */
router.post("/custom-image", async (req, res) => {
  const { prompt } = req.body as { prompt: string };
  if (!prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  try {
    const { generateImageBuffer } = await import("@workspace/integrations-openai-ai-server/image");
    const enhancedPrompt = `${prompt}. Style: cinematic, high quality, suitable for a church worship presentation background. No text, no letters, no words anywhere in the image.`;
    const buffer = await generateImageBuffer(enhancedPrompt, "1536x1024");
    res.json({ b64_json: buffer.toString("base64") });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Image generation failed";
    res.status(500).json({ error: msg });
  }
});

/* ── Verse-to-Art ───────────────────────────────────────────── */
router.post("/verse-art", async (req, res) => {
  const { verse, reference, book } = req.body as { verse: string; reference: string; book?: string };
  if (!verse?.trim()) {
    res.status(400).json({ error: "verse is required" });
    return;
  }
  try {
    const { generateImageBuffer } = await import("@workspace/integrations-openai-ai-server/image");
    const bookCtx = book ? ` Set in the world of the book of ${book}.` : "";
    const prompt = `A dramatic, reverential biblical illustration depicting ${reference}: "${verse.slice(0, 280)}".${bookCtx} Style: oil painting, classical biblical art in the tradition of Rembrandt and Gustave Doré. Rich warm tones, spiritual atmosphere, ancient Middle Eastern setting, soft divine light. No text, no letters, no words anywhere in the image.`;
    const buffer = await generateImageBuffer(prompt, "1024x1024");
    res.json({ b64_json: buffer.toString("base64") });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Image generation failed";
    res.status(500).json({ error: msg });
  }
});

/* ── Sermon Outline Generator ────────────────────────────────── */
router.post("/sermon-outline", async (req, res) => {
  const { topic, verse, style } = req.body as { topic: string; verse?: string; style?: string };
  if (!topic?.trim()) { res.status(400).json({ error: "topic is required" }); return; }
  const verseCtx = verse?.trim() ? ` anchored on the passage: "${verse}"` : "";
  const styleCtx = style?.trim() ? ` Preaching style: ${style}.` : "";
  await streamCompletion(res,
    `You are an experienced pastor and theologian helping prepare church sermons. Generate a clear, structured, Scripture-rich sermon outline suitable for a Sunday service.${styleCtx}
Format the outline with:
- A compelling title
- Key Scripture reference(s)
- Introduction (hook + context)
- 3-5 main points, each with sub-points and Bible references
- Practical application for each point
- Conclusion with a call to action or altar call
- Suggested closing prayer topic
Keep it pastoral, warm, and grounded in Scripture.`,
    `Create a full sermon outline on the topic: "${topic}"${verseCtx}`
  );
});

/* ── Prayer Generator ────────────────────────────────────────── */
router.post("/prayer", async (req, res) => {
  const { type, topic, occasion } = req.body as { type?: string; topic: string; occasion?: string };
  if (!topic?.trim()) { res.status(400).json({ error: "topic is required" }); return; }
  const occasionCtx = occasion?.trim() ? ` for ${occasion}` : "";
  const prayerType = type?.trim() || "worship";
  await streamCompletion(res,
    `You are a worship leader and intercessor helping write heartfelt, Scripture-inspired prayers for church services. Write prayers that are reverent, sincere, and suitable for congregational use.
Guidelines:
- Open with praise and acknowledgement of God
- Be specific about the topic or need
- Include Scripture references naturally woven in
- Close with thanksgiving and surrender
- Appropriate length for corporate worship (not too long)`,
    `Write a ${prayerType} prayer${occasionCtx} about: "${topic}"`
  );
});

/* ── Worship Set Planner ─────────────────────────────────────── */
router.post("/worship-set", async (req, res) => {
  const { theme, occasion, numSongs } = req.body as { theme: string; occasion?: string; numSongs?: number };
  if (!theme?.trim()) { res.status(400).json({ error: "theme is required" }); return; }
  const n = numSongs ?? 5;
  const occasionCtx = occasion?.trim() ? ` for ${occasion}` : "";
  await streamCompletion(res,
    `You are an experienced worship director helping plan Sunday service worship sets. Suggest well-known contemporary and classic worship songs that flow together thematically.
For each song provide:
- Song title & artist/songwriter
- Key & tempo (slow/medium/upbeat)
- Why it fits the theme
- Flow note (opener, build, peak, response, closing)
Also suggest:
- Scripture reading that fits between songs
- A brief transition thought for the worship leader
- Overall arc of the set (from gathering to encounter to response)`,
    `Plan a worship set of ${n} songs${occasionCtx} with the theme: "${theme}"`
  );
});

/* ── Church Announcement Writer ──────────────────────────────── */
router.post("/announcement", async (req, res) => {
  const { topic, details, tone } = req.body as { topic: string; details?: string; tone?: string };
  if (!topic?.trim()) { res.status(400).json({ error: "topic is required" }); return; }
  const detailsCtx = details?.trim() ? `\n\nDetails provided: ${details}` : "";
  const toneCtx = tone?.trim() || "warm and inviting";
  await streamCompletion(res,
    `You are a church communications assistant writing engaging church announcements for Sunday services, bulletins, and presentations.
Style: ${toneCtx}. Write clearly and concisely, using friendly church-appropriate language.
Format: Start with a catchy 1-line headline, then 2-3 sentences of detail, then a clear call-to-action.`,
    `Write a church announcement about: "${topic}"${detailsCtx}`
  );
});

/* ── AI Song Generator ────────────────────────────────────────── */
router.post("/generate-song", async (req, res) => {
  const { title, theme, style, numVerses } = req.body as { title?: string; theme: string; style?: string; numVerses?: number };
  if (!theme?.trim()) { res.status(400).json({ error: "theme is required" }); return; }
  const n = numVerses ?? 2;
  const titleCtx = title?.trim() ? `Song title: "${title}". ` : "";
  const styleCtx = style?.trim() ? ` Musical style: ${style}.` : " Musical style: contemporary gospel worship.";
  await streamCompletion(res,
    `You are a gifted gospel worship songwriter. Write complete, singable worship songs with strong theology and emotional depth.
${styleCtx}
Format the song EXACTLY like this (with brackets for labels):
[Verse 1]
(verse lyrics here)

[Pre-Chorus]
(optional pre-chorus)

[Chorus]
(chorus lyrics — the main hook, repeated)

[Verse 2]
(second verse)

[Bridge]
(bridge lyrics — climactic moment)

[Outro]
(optional closing lines)

Guidelines:
- Each section should be 4-8 lines
- Rhyme scheme should feel natural, not forced
- Include Scripture themes naturally — no need to cite references directly
- Chorus should be memorable and congregationally singable
- Avoid clichés; aim for fresh, heartfelt expression
- Keep the overall message clear and focused on the theme`,
    `${titleCtx}Write a complete worship song about: "${theme}"`
  );
});

export default router;
