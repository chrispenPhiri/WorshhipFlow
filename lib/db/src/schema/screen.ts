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
  tickerSpeed: integer("ticker_speed").default(20),
  tickerDivider: text("ticker_divider").default("✦"),
  tickerColor: text("ticker_color").default("#ffffff"),
  tickerBgColor: text("ticker_bg_color").default("rgba(0,0,0,0.75)"),
  tickerFontSize: integer("ticker_font_size").default(18),
  idleWatermark: text("idle_watermark"),
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
  lowerThirdAutoDismissSec: integer("lower_third_auto_dismiss_sec").default(0),
  clockOverlayEnabled: boolean("clock_overlay_enabled").notNull().default(false),
  clockPosition: text("clock_position").default("top-right"),
  clockStyle: text("clock_style").default("digital"),
  clockShowDate: boolean("clock_show_date").notNull().default(false),
  clockShowSeconds: boolean("clock_show_seconds").notNull().default(true),
  clockDateFormat: text("clock_date_format").default("long"),
  clockFontSize: integer("clock_font_size").default(16),
  clockColor: text("clock_color").default("rgba(255,255,255,0.92)"),
  clockBgColor: text("clock_bg_color").default("rgba(0,0,0,0.52)"),
  clockBgOpacity: integer("clock_bg_opacity").default(100),
  clockBgRadius: integer("clock_bg_radius").default(6),
  clockBgPadding: integer("clock_bg_padding").default(13),
  logoOverlayEnabled: boolean("logo_overlay_enabled").notNull().default(false),
  logoUrl: text("logo_url"),
  logoPosition: text("logo_position").default("top-right"),
  logoSize: integer("logo_size").default(20),
  logoOpacity: integer("logo_opacity").default(100),
  logoShape: text("logo_shape").default("rect"),
  logoText: text("logo_text"),
  logoTextColor: text("logo_text_color").default("#ffffff"),
  logoTextSize: integer("logo_text_size").default(14),
  logoTextPosition: text("logo_text_position").default("right"),
  logoTextWeight: text("logo_text_weight").default("600"),
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
  textOverlayOpacity: integer("text_overlay_opacity").default(100),
  textOverlayPadding: integer("text_overlay_padding").default(8),
  textOverlayRadius: integer("text_overlay_radius").default(4),
  textOverlayLetterSpacing: integer("text_overlay_letter_spacing").default(0),
  textOverlayAnimation: text("text_overlay_animation").default("none"),
  textOverlayMaxWidth: integer("text_overlay_max_width").default(80),
  textOverlayBorderColor: text("text_overlay_border_color").default("transparent"),
  textOverlayBorderWidth: integer("text_overlay_border_width").default(0),
  textOverlayAutoDismissSec: integer("text_overlay_auto_dismiss_sec").default(0),
  comparisonMode: boolean("comparison_mode").notNull().default(false),
  secondaryTitle: text("secondary_title"),
  secondaryContent: text("secondary_content"),
  timerEnabled: boolean("timer_enabled").notNull().default(false),
  timerMode: text("timer_mode").default("stopwatch"),
  timerStartedAt: text("timer_started_at"),
  timerAccumulatedMs: integer("timer_accumulated_ms").default(0),
  timerDurationSec: integer("timer_duration_sec").default(300),
  timerPosition: text("timer_position").default("top-center"),
  timerFontSize: integer("timer_font_size").default(48),
  timerColor: text("timer_color").default("#ffffff"),
  timerBgColor: text("timer_bg_color").default("rgba(0,0,0,0.6)"),
  timerLabel: text("timer_label"),
  timerWarningSec: integer("timer_warning_sec").default(60),
  timerWarningColor: text("timer_warning_color").default("#fbbf24"),
  timerCriticalColor: text("timer_critical_color").default("#ef4444"),
  // Scripture reference label customization (the "John 3:16 • KJV" pill at the bottom of bible verses).
  bibleRefFontSize: integer("bible_ref_font_size").default(28),
  bibleRefColor: text("bible_ref_color").default("#ffffff"),
  bibleRefBgColor: text("bible_ref_bg_color").default("rgba(0,0,0,0.55)"),
  bibleRefBold: boolean("bible_ref_bold").notNull().default(true),
  bibleRefShowTranslation: boolean("bible_ref_show_translation").notNull().default(true),
  bibleRefPadding: integer("bible_ref_padding").default(10),
  bibleRefRadius: integer("bible_ref_radius").default(6),
  bibleRefLetterSpacing: integer("bible_ref_letter_spacing").default(4),
  bibleRefUppercase: boolean("bible_ref_uppercase").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertScreenStateSchema = createInsertSchema(screenStateTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertScreenState = z.infer<typeof insertScreenStateSchema>;
export type ScreenState = typeof screenStateTable.$inferSelect;
