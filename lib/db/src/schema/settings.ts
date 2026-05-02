import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  defaultBibleVersion: text("default_bible_version").notNull().default("kjv"),
  defaultFont: text("default_font").notNull().default("Inter"),
  defaultFontSize: integer("default_font_size").notNull().default(64),
  defaultTextColor: text("default_text_color").notNull().default("#ffffff"),
  defaultAccentColor: text("default_accent_color").notNull().default("#f59e0b"),
  theme: text("theme").notNull().default("dark"),
  tickerEnabled: boolean("ticker_enabled").notNull().default(false),
  tickerText: text("ticker_text").notNull().default("Welcome to worship!"),
  tickerSpeed: integer("ticker_speed").notNull().default(25),
  churchName: text("church_name").notNull().default("WorshipFlow Church"),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
