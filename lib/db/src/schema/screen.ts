import { pgTable, serial, text, boolean, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  accentColor: string;
  bold: boolean;
  italic: boolean;
  alignment: "left" | "center" | "right";
  animation: "none" | "fade_in" | "glow" | "float";
}

export interface Background {
  type: "color" | "gradient" | "image" | "video";
  value: string;
  overlay?: number;
}

export const screenStateTable = pgTable("screen_state", {
  id: serial("id").primaryKey(),
  isBlack: boolean("is_black").notNull().default(false),
  isClear: boolean("is_clear").notNull().default(true),
  contentType: text("content_type").notNull().default("none"),
  title: text("title"),
  content: text("content"),
  textStyle: json("text_style").$type<TextStyle>().default({
    fontFamily: "Inter",
    fontSize: 64,
    textColor: "#ffffff",
    accentColor: "#f59e0b",
    bold: false,
    italic: false,
    alignment: "center",
    animation: "none",
  }),
  background: json("background").$type<Background>().default({
    type: "color",
    value: "#000000",
    overlay: 0,
  }),
  tickerEnabled: boolean("ticker_enabled").notNull().default(false),
  tickerText: text("ticker_text"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertScreenStateSchema = createInsertSchema(screenStateTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertScreenState = z.infer<typeof insertScreenStateSchema>;
export type ScreenState = typeof screenStateTable.$inferSelect;
