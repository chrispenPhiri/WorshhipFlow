import { useEffect } from "react";
import { CHANNEL_NAME, type BroadcastCommand } from "./use-broadcast";

/**
 * Operator-side global keyboard scroll for the broadcast/presentation screen.
 *
 * Listens for ↑ / ↓ / Home / End / PageUp / PageDown anywhere in the operator
 * app and posts a scroll command on the same BroadcastChannel the broadcast
 * window listens on. This means the operator does NOT have to focus a button
 * (or the broadcast window itself) to nudge long Bible passages, song lyrics
 * or sermon notes up and down on the audience display.
 *
 * Intentionally NO-OP when:
 *   - the active element is an input / textarea / select / contentEditable
 *   - any modifier key (Cmd / Ctrl / Alt) is held — those are reserved for the
 *     browser / OS
 *   - the user is on the /broadcast page itself (that page has its own
 *     direct keydown handler that scrolls without going through the channel)
 */
export function useGlobalScrollKeys() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.endsWith("/broadcast")) return;

    let channel: BroadcastChannel | null = null;
    const getChannel = () => {
      if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
      return channel;
    };
    const send = (cmd: BroadcastCommand) => getChannel().postMessage(cmd);

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      const editable =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
        t?.isContentEditable === true ||
        t?.getAttribute?.("role") === "textbox";
      if (editable) return;

      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
          e.preventDefault();
          // Stopping is idempotent on the broadcast side, so we don't need
          // to track auto-scroll state here.
          send({ type: "scroll_auto_stop" });
          send({ type: "scroll_down" });
          break;
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          send({ type: "scroll_auto_stop" });
          send({ type: "scroll_up" });
          break;
        case "Home":
          e.preventDefault();
          send({ type: "scroll_auto_stop" });
          send({ type: "scroll_reset" });
          break;
        case "End":
          // Walk down a few times to push toward the end. The broadcast clamps
          // to its actual overflow so this is safe.
          e.preventDefault();
          send({ type: "scroll_auto_stop" });
          for (let i = 0; i < 12; i++) send({ type: "scroll_down" });
          break;
        case " ":
          // Space toggles teleprompter / auto-scroll.  The broadcast window
          // is the single source of truth — it decides start vs stop based
          // on its own timer state, so we cannot desync.
          e.preventDefault();
          send({ type: "scroll_auto_toggle", speed: 60 });
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      channel?.close();
      channel = null;
    };
  }, []);
}
