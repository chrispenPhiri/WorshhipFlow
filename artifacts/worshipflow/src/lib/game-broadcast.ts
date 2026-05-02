/**
 * Shared "send game content to projection screen" hook.
 *
 * Two flavours:
 *
 *  - `presentOnScreen(label, title, content)` is the legacy plain-text
 *    path.  It writes a `custom_text` content type with a label prefix.
 *    Kept around so non-game callers (e.g. Daily Inspiration) keep
 *    working unchanged.
 *
 *  - `presentGameView(label, title, payload)` is the rich path.  It
 *    encodes a structured `GameStagePayload` into `content` (as JSON),
 *    sets `contentType: "game"`, and lets the broadcast / live-preview
 *    render the actual game UI (option blocks, letter slots, lives,
 *    coloured cards) at stage scale via <GameStageView>.
 *
 * Each game component picks one flavour per "Send to screen" button.
 * The screen-state schema is unchanged — we just overload the meaning
 * of `content` based on `contentType`.
 */

import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateScreenState,
  useGetScreenState,
  getGetScreenStateQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { encodeGamePayload, type GameStagePayload } from "@/lib/game-stage-payload";

interface PresentOpts {
  /** Override the default font size (px). Useful for big single emojis. */
  fontSize?: number;
  /** Override alignment (default center). */
  alignment?: "left" | "center" | "right";
}

export function useGameBroadcast() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: screenState } = useGetScreenState({
    query: { queryKey: getGetScreenStateQueryKey() },
  });
  const { mutate: updateScreen } = useUpdateScreenState({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() }),
    },
  });

  /**
   * Project a game card / question / prompt onto the broadcast screen.
   *
   * @param label   Short game name shown above the content (e.g. "Bible Charades").
   * @param title   Internal title (used by the recently-presented widget; not shown).
   * @param content Body text. Newlines are preserved on screen.
   */
  function presentOnScreen(
    label: string,
    title: string,
    content: string,
    opts: PresentOpts = {},
  ): void {
    const baseStyle = screenState?.textStyle ?? {
      fontFamily: "Georgia",
      fontSize: 64,
      textColor: "#ffffff",
      accentColor: "#f59e0b",
      alignment: "center" as const,
      animation: "fade_in" as const,
    };
    const screenContent = `${label}\n\n${content}`;
    updateScreen({
      data: {
        isBlack: screenState?.isBlack ?? false,
        isClear: false,
        contentType: "custom_text" as const,
        title,
        content: screenContent,
        textStyle: {
          ...baseStyle,
          fontSize: opts.fontSize ?? 56,
          alignment: opts.alignment ?? ("center" as const),
          fontFamily: baseStyle.fontFamily ?? "Georgia",
          animation: baseStyle.animation ?? "fade_in",
        },
        background: screenState?.background ?? { type: "color", value: "#000000" },
        tickerEnabled: screenState?.tickerEnabled ?? false,
        comparisonMode: false,
      },
    });
    toast({ title: "Sent to screen", description: `${label} — ${title}` });
  }

  /**
   * Project a structured game payload onto the broadcast screen.  The
   * broadcast renderer recognises `contentType === "game"` and feeds the
   * decoded payload to <GameStageView>, which renders the same coloured
   * cards / option blocks the operator sees, just blown up to stage
   * scale.  Layout / textStyle / background settings are preserved.
   */
  function presentGameView(
    label: string,
    title: string,
    payload: GameStagePayload,
  ): void {
    const baseStyle = screenState?.textStyle ?? {
      fontFamily: "Georgia",
      fontSize: 64,
      textColor: "#ffffff",
      accentColor: "#f59e0b",
      alignment: "center" as const,
      animation: "fade_in" as const,
    };
    updateScreen({
      data: {
        isBlack: screenState?.isBlack ?? false,
        isClear: false,
        contentType: "game" as const,
        title: `${label} — ${title}`,
        content: encodeGamePayload(payload),
        textStyle: {
          ...baseStyle,
          // Game stage view uses its own internal sizing scale; we keep
          // a sensible base so the preview pane (which falls back to
          // text rendering) doesn't display tiny text either.
          fontSize: baseStyle.fontSize ?? 64,
          alignment: baseStyle.alignment ?? "center",
          fontFamily: baseStyle.fontFamily ?? "Georgia",
          animation: baseStyle.animation ?? "fade_in",
        },
        background: screenState?.background ?? { type: "color", value: "#000000" },
        tickerEnabled: screenState?.tickerEnabled ?? false,
        comparisonMode: false,
      },
    });
    toast({ title: "Sent to screen", description: `${label} — ${title}` });
  }

  return { presentOnScreen, presentGameView };
}
