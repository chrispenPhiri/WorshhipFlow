/**
 * Shared "send game content to projection screen" hook.
 *
 * Mirrors the pattern used by the Daily Inspiration page (see
 * `pages/inspiration.tsx`): we re-use the existing `custom_text` content
 * type — no new screen-state fields, no broadcast-renderer changes — and
 * prepend a category label so the audience clearly sees what game is on
 * screen (e.g. "Bible Trivia", "Bible Charades").
 *
 * Each game component imports `useGameBroadcast()` and calls
 * `presentOnScreen(label, title, content)` whenever the operator clicks
 * the per-game "Send to screen" button.
 *
 * Why a shared helper instead of inlining `updateScreen` in every game:
 * a) all games get identical stage formatting (centred, large font,
 *    visible label), b) future tweaks (e.g. switching to a dedicated
 *    `game` content type) only need to happen in one place.
 */

import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateScreenState,
  useGetScreenState,
  getGetScreenStateQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

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

  return { presentOnScreen };
}
