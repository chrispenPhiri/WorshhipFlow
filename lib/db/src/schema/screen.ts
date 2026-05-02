import { pgTable, serial, text, boolean, json, timestamp } from "drizzle-orm/pg-core";
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
  type: "color" | "gradient" | "image" | "video" | "camera" | "live_wallpaper";
  value: string;
  overlay?: number;
}

export interface Layout {
  textScale: number;
  verticalAlign: "top" | "center" | "bottom";
  horizontalAlign: "left" | "center" | "right";
  paddingX: number;
  paddingY: number;
  textWidthPct: number;
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
  layout: json("layout").$type<Layout>().default({
    textScale: 1,
    verticalAlign: "center",
    horizontalAlign: "center",
    paddingX: 8,
    paddingY: 8,
    textWidthPct: 100,
  }),
  tickerEnabled: boolean("ticker_enabled").notNull().default(false),
  tickerText: text("ticker_text"),
  lowerThirdEnabled: boolean("lower_third_enabled").notNull().default(false),
  lowerThirdName: text("lower_third_name"),
  lowerThirdTitle: text("lower_third_title"),
  lowerThirdPosition: text("lower_third_position").default("bottom-left"),
  lowerThirdStyle: text("lower_third_style").default("modern"),
  clockOverlayEnabled: boolean("clock_overlay_enabled").notNull().default(false),
  clockPosition: text("clock_position").default("top-right"),
  clockStyle: text("clock_style").default("digital"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertScreenStateSchema = createInsertSchema(screenStateTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertScreenState = z.infer<typeof insertScreenStateSchema>;
export type ScreenState = typeof screenStateTable.$inferSelect;
