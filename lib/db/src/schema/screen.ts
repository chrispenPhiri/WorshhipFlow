import { pgTable, serial, text, boolean, json, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  accentColor?: string;
  bold?: boolean;
  italic?: boolean;
  alignment: "left" | "center" | "right";
  animation: "none" | "fade_in" | "glow" | "float";
}

export interface Background {
  type: "color" | "gradient" | "image" | "video" | "camera" | "live_wallpaper";
  value: string;
  overlay?: number;
  fit?: "cover" | "contain" | "fill";
  loop?: boolean;
  cameraLayout?: "fullscreen" | "pip-topright" | "pip-topleft" | "pip-bottomright" | "pip-bottomleft" | "side-left" | "side-right";
  cameraShape?: "rect" | "circle" | "rounded";
  cameraPipSize?: number;
}

export interface Layout {
  textScale?: number;
  verticalAlign?: "top" | "center" | "bottom";
  horizontalAlign?: "left" | "center" | "right";
  paddingX?: number;
  paddingY?: number;
  textWidthPct?: number;
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
  lowerThirdNameColor: text("lower_third_name_color").default("#ffffff"),
  lowerThirdTitleColor: text("lower_third_title_color").default("rgba(255,255,255,0.65)"),
  lowerThirdBgColor: text("lower_third_bg_color").default("rgba(0,0,0,0.72)"),
  lowerThirdAccentColor: text("lower_third_accent_color").default("rgba(255,255,255,0.75)"),
  lowerThirdNameSize: integer("lower_third_name_size").default(22),
  lowerThirdTitleSize: integer("lower_third_title_size").default(13),
  clockOverlayEnabled: boolean("clock_overlay_enabled").notNull().default(false),
  clockPosition: text("clock_position").default("top-right"),
  clockStyle: text("clock_style").default("digital"),
  clockShowDate: boolean("clock_show_date").notNull().default(false),
  clockDateFormat: text("clock_date_format").default("long"),
  clockFontSize: integer("clock_font_size").default(16),
  clockColor: text("clock_color").default("rgba(255,255,255,0.92)"),
  logoOverlayEnabled: boolean("logo_overlay_enabled").notNull().default(false),
  logoUrl: text("logo_url"),
  logoPosition: text("logo_position").default("top-right"),
  logoSize: integer("logo_size").default(20),
  logoOpacity: integer("logo_opacity").default(100),
  textOverlayEnabled: boolean("text_overlay_enabled").notNull().default(false),
  textOverlayContent: text("text_overlay_content"),
  textOverlayPosition: text("text_overlay_position").default("top-left"),
  textOverlayFontSize: integer("text_overlay_font_size").default(36),
  textOverlayColor: text("text_overlay_color").default("#ffffff"),
  textOverlayBg: text("text_overlay_bg").default("rgba(0,0,0,0.55)"),
  textOverlayBold: boolean("text_overlay_bold").notNull().default(false),
  textOverlayItalic: boolean("text_overlay_italic").notNull().default(false),
  textOverlayAlign: text("text_overlay_align").default("left"),
  textOverlayFontFamily: text("text_overlay_font_family").default("inherit"),
  textOverlayShadow: boolean("text_overlay_shadow").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertScreenStateSchema = createInsertSchema(screenStateTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertScreenState = z.infer<typeof insertScreenStateSchema>;
export type ScreenState = typeof screenStateTable.$inferSelect;
