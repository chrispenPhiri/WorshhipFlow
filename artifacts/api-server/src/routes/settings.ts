import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router = Router();

async function ensureSettings() {
  const existing = await db.select().from(settingsTable).limit(1);
  if (existing.length === 0) {
    const [row] = await db.insert(settingsTable).values({}).returning();
    return row;
  }
  return existing[0];
}

router.get("/", async (_req, res) => {
  const settings = await ensureSettings();
  return res.json(settings);
});

router.put("/", async (req, res) => {
  const body = UpdateSettingsBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.issues });
  }

  const settings = await ensureSettings();
  const [updated] = await db
    .update(settingsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(settingsTable.id, settings.id))
    .returning();
  return res.json(updated);
});

export default router;
