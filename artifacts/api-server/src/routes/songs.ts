import { Router } from "express";
import { db, songsTable } from "@workspace/db";
import { eq, ilike, sql } from "drizzle-orm";
import {
  CreateSongBody,
  UpdateSongBody,
  GetSongParams,
  UpdateSongParams,
  DeleteSongParams,
  ListSongsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const query = ListSongsQueryParams.safeParse(req.query);
  if (!query.success) {
    return res.status(400).json({ error: query.error.issues });
  }
  const { category, search } = query.data;

  let rows = await db.select().from(songsTable).orderBy(songsTable.title);

  if (category) {
    rows = rows.filter((s) => s.category === category);
  }
  if (search) {
    const lower = search.toLowerCase();
    rows = rows.filter(
      (s) =>
        s.title.toLowerCase().includes(lower) ||
        s.author.toLowerCase().includes(lower)
    );
  }

  return res.json(rows);
});

router.get("/stats", async (_req, res) => {
  const rows = await db.select().from(songsTable);
  const byCategory: Record<string, number> = {};
  for (const row of rows) {
    byCategory[row.category] = (byCategory[row.category] ?? 0) + 1;
  }
  return res.json({ total: rows.length, byCategory });
});

router.post("/", async (req, res) => {
  const body = CreateSongBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.issues });
  }
  const [song] = await db
    .insert(songsTable)
    .values({ ...body.data, tags: body.data.tags ?? [] })
    .returning();
  return res.status(201).json(song);
});

router.get("/:id", async (req, res) => {
  const params = GetSongParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [song] = await db
    .select()
    .from(songsTable)
    .where(eq(songsTable.id, params.data.id));
  if (!song) return res.status(404).json({ error: "Not found" });
  return res.json(song);
});

router.put("/:id", async (req, res) => {
  const params = UpdateSongParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const body = UpdateSongBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.issues });
  }

  const [song] = await db
    .update(songsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(songsTable.id, params.data.id))
    .returning();
  if (!song) return res.status(404).json({ error: "Not found" });
  return res.json(song);
});

router.delete("/:id", async (req, res) => {
  const params = DeleteSongParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(songsTable).where(eq(songsTable.id, params.data.id));
  return res.status(204).send();
});

export default router;
