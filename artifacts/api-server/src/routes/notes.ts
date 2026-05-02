import { Router } from "express";
import { db, notesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateNoteBody,
  UpdateNoteBody,
  GetNoteParams,
  UpdateNoteParams,
  DeleteNoteParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db
    .select()
    .from(notesTable)
    .orderBy(notesTable.date);
  return res.json(rows);
});

router.post("/", async (req, res) => {
  const body = CreateNoteBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.issues });
  }
  const { date, ...rest } = body.data;
  const [note] = await db
    .insert(notesTable)
    .values({ ...rest, date: date instanceof Date ? date.toISOString().slice(0, 10) : date, scriptures: rest.scriptures ?? [] })
    .returning();
  return res.status(201).json(note);
});

router.get("/:id", async (req, res) => {
  const params = GetNoteParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [note] = await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.id, params.data.id));
  if (!note) return res.status(404).json({ error: "Not found" });
  return res.json(note);
});

router.put("/:id", async (req, res) => {
  const params = UpdateNoteParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const body = UpdateNoteBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.issues });
  }

  const { date: noteDate, ...restNote } = body.data;
  const [note] = await db
    .update(notesTable)
    .set({ ...restNote, date: noteDate instanceof Date ? noteDate.toISOString().slice(0, 10) : noteDate, updatedAt: new Date() })
    .where(eq(notesTable.id, params.data.id))
    .returning();
  if (!note) return res.status(404).json({ error: "Not found" });
  return res.json(note);
});

router.delete("/:id", async (req, res) => {
  const params = DeleteNoteParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(notesTable).where(eq(notesTable.id, params.data.id));
  return res.status(204).send();
});

export default router;
