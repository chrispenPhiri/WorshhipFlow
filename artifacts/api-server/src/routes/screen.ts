import { Router } from "express";
import { db, screenStateTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateScreenStateBody } from "@workspace/api-zod";

const router = Router();

async function ensureScreenState() {
  const existing = await db.select().from(screenStateTable).limit(1);
  if (existing.length === 0) {
    const [row] = await db.insert(screenStateTable).values({}).returning();
    return row;
  }
  return existing[0];
}

router.get("/", async (_req, res) => {
  const state = await ensureScreenState();
  return res.json(state);
});

router.put("/", async (req, res) => {
  const body = UpdateScreenStateBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.issues });
  }

  const state = await ensureScreenState();
  const [updated] = await db
    .update(screenStateTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(screenStateTable.id, state.id))
    .returning();
  return res.json(updated);
});

export default router;
