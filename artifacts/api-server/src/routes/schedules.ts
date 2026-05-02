import { Router } from "express";
import { db, schedulesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateScheduleBody,
  UpdateScheduleBody,
  GetScheduleParams,
  UpdateScheduleParams,
  DeleteScheduleParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db
    .select()
    .from(schedulesTable)
    .orderBy(schedulesTable.date);
  return res.json(rows);
});

router.post("/", async (req, res) => {
  const body = CreateScheduleBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.issues });
  }
  const { date, ...rest } = body.data;
  const [schedule] = await db
    .insert(schedulesTable)
    .values({ ...rest, date: date instanceof Date ? date.toISOString().slice(0, 10) : date, items: rest.items ?? [] })
    .returning();
  return res.status(201).json(schedule);
});

router.get("/:id", async (req, res) => {
  const params = GetScheduleParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const [schedule] = await db
    .select()
    .from(schedulesTable)
    .where(eq(schedulesTable.id, params.data.id));
  if (!schedule) return res.status(404).json({ error: "Not found" });
  return res.json(schedule);
});

router.put("/:id", async (req, res) => {
  const params = UpdateScheduleParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  const body = UpdateScheduleBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.issues });
  }

  const { date: schedDate, ...restSched } = body.data;
  const [schedule] = await db
    .update(schedulesTable)
    .set({ ...restSched, date: schedDate instanceof Date ? schedDate.toISOString().slice(0, 10) : schedDate, updatedAt: new Date() })
    .where(eq(schedulesTable.id, params.data.id))
    .returning();
  if (!schedule) return res.status(404).json({ error: "Not found" });
  return res.json(schedule);
});

router.delete("/:id", async (req, res) => {
  const params = DeleteScheduleParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(schedulesTable).where(eq(schedulesTable.id, params.data.id));
  return res.status(204).send();
});

export default router;
