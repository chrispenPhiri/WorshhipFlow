import { useState } from "react";
import { Eye, Users, Wifi, WifiOff, ChevronUp, ChevronDown, RefreshCw } from "lucide-react";
import { LiveSessionPanel } from "./live-session-panel";
import type { LiveSessionState } from "@/lib/live-session";

interface Props {
  sessionState: LiveSessionState;
  sessionOpen: boolean;
  onSessionOpenChange: (open: boolean) => void;
  createSession: (displayName: string) => void;
  joinSession: (code: string, displayName: string) => void;
  leaveSession: () => void;
  changeRole: (memberId: string, role: "operator" | "viewer") => void;
  clearError: () => void;
}

export function SessionViewerMode({
  sessionState,
  sessionOpen,
  onSessionOpenChange,
  createSession,
  joinSession,
  leaveSession,
  changeRole,
  clearError,
}: Props) {
  const [barVisible, setBarVisible] = useState(true);

  // Construct broadcast URL at the same origin, root-relative
  const broadcastUrl = `${window.location.protocol}//${window.location.host}/broadcast`;

  const onlineCount = sessionState.members.length;
  const masterName = sessionState.members.find(m => m.role === "master")?.displayName;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* ── Full-screen broadcast iframe ── */}
      <iframe
        src={broadcastUrl}
        className="flex-1 w-full border-0 min-h-0"
        title="Live presentation"
        allow="autoplay; camera; microphone; display-capture"
        style={{ background: "#000" }}
      />

      {/* ── Viewer status bar (collapsible) ── */}
      <div
        className="shrink-0 border-t border-white/10 bg-black/80 backdrop-blur-md transition-all duration-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Collapse toggle tab */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setBarVisible(v => !v)}
            className="flex items-center gap-1 px-4 py-1 text-white/30 hover:text-white/60 transition-colors text-[10px] font-medium tracking-wider select-none"
            aria-label={barVisible ? "Hide status bar" : "Show status bar"}
          >
            {barVisible
              ? <><ChevronDown className="w-3 h-3" /> hide</>
              : <><ChevronUp className="w-3 h-3" /> {sessionState.code}</>
            }
          </button>
        </div>

        {barVisible && (
          <div className="flex items-center gap-3 px-4 pb-3">
            {/* Connection indicator */}
            <div className="flex items-center gap-1.5">
              {sessionState.status === "reconnecting" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" />
                  <span className="text-xs text-amber-400/80">Reconnecting…</span>
                </>
              ) : sessionState.status === "connected" ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs text-white/50">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  <span className="text-xs text-white/30">Offline</span>
                </>
              )}
            </div>

            {/* Room code */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/40">Room</span>
              <code className="text-xs font-mono font-bold text-white tracking-widest">
                {sessionState.code}
              </code>
            </div>

            {/* Viewer role badge */}
            <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5">
              <Eye className="w-3 h-3 text-white/60" />
              <span className="text-[10px] text-white/60 font-medium">Viewer</span>
            </div>

            {/* Master name */}
            {masterName && (
              <span className="text-xs text-white/30 hidden sm:inline truncate flex-1">
                Master: {masterName}
              </span>
            )}

            <div className="flex-1" />

            {/* Online count + session button */}
            <button
              type="button"
              onClick={() => onSessionOpenChange(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Open session panel"
            >
              <Users className="w-3.5 h-3.5 text-white/70" />
              <span className="text-xs text-white/70 font-medium">{onlineCount}</span>
            </button>
          </div>
        )}
      </div>

      {/* Session panel — accessible even in viewer mode */}
      <LiveSessionPanel
        open={sessionOpen}
        onOpenChange={onSessionOpenChange}
        sessionState={sessionState}
        createSession={createSession}
        joinSession={joinSession}
        leaveSession={leaveSession}
        changeRole={changeRole}
        clearError={clearError}
      />
    </div>
  );
}
