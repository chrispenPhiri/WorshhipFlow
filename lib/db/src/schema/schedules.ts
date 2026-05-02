import { pgTable, serial, text, timestamp, json, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface ScheduleItem {
  type: "song" | "verse" | "custom_text" | "prayer" | "announcement" | "sermon";
  title: string;
  content?: string;
  songId?: number;
  notes?: string;
}

export const schedulesTable = pgTable("schedules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  serviceType: text("service_type").notNull().default("sunday_morning"),
  date: date("date").notNull(),
  items: json("items").$type<ScheduleItem[]>().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertScheduleSchema = createInsertSchema(schedulesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedulesTable.$inferSelect;
