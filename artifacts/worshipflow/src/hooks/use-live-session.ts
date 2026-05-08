import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  type ClientMessage,
  type LiveSessionState,
  type MemberRole,
  type ServerMessage,
  INITIAL_SESSION_STATE,
  getSessionWsUrl,
} from "@/lib/live-session";
import { getGetScreenStateQueryKey } from "@/api/generated/worshipflow";
import { subscribeScreenChanges } from "@/lib/local-api";

export function useLiveSession() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<LiveSessionState>(INITIAL_SESSION_STATE);

  const [state, setState] = useState<LiveSessionState>(INITIAL_SESSION_STATE);

  // Keep ref in sync with state for use inside callbacks
  useEffect(() => {
    sessionRef.current = state;
  }, [state]);

  // Apply a remote screen state received from WS to local IndexedDB
  const applyRemoteState = useCallback(async (remoteState: Record<string, unknown>) => {
    if (!remoteState || Object.keys(remoteState).length === 0) return;
    isApplyingRemoteRef.current = true;
    try {
      await fetch("/api/screen", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(remoteState),
      });
      queryClient.invalidateQueries({ queryKey: getGetScreenStateQueryKey() });
    } catch { /* ignore */ } finally {
      // Give BroadcastChannel a moment to fire before clearing the flag
      setTimeout(() => { isApplyingRemoteRef.current = false; }, 300);
    }
  }, [queryClient]);

  // Message handler (uses setState functional form so no stale state)
  const handleMsgRef = useRef<((msg: ServerMessage) => void) | null>(null);
  handleMsgRef.current = (msg: ServerMessage) => {
    switch (msg.type) {
      case "session_created":
        setState({
          status: "connected",
          code: msg.code,
          myId: msg.myId,
          myRole: "master",
          members: msg.members,
          error: null,
        });
        break;

      case "session_joined":
        setState({
          status: "connected",
          code: msg.code,
          myId: msg.myId,
          myRole: msg.role,
          members: msg.members,
          error: null,
        });
        void applyRemoteState(msg.screenState);
        break;

      case "session_left":
        setState(INITIAL_SESSION_STATE);
        break;

      case "member_joined":
        setState(prev => ({
          ...prev,
          members: [...prev.members.filter(m => m.id !== msg.member.id), msg.member],
        }));
        break;

      case "member_left":
        setState(prev => ({
          ...prev,
          members: prev.members.filter(m => m.id !== msg.memberId),
        }));
        break;

      case "screen_update":
        void applyRemoteState(msg.state);
        break;

      case "role_changed":
        setState(prev => ({
          ...prev,
          myRole: prev.myId === msg.memberId ? msg.role : prev.myRole,
          members: prev.members.map(m =>
            m.id === msg.memberId ? { ...m, role: msg.role as MemberRole } : m
          ),
        }));
        break;

      case "error":
        setState(prev => ({
          ...prev,
          status: prev.status === "connecting" ? "idle" : prev.status,
          error: msg.message,
        }));
        break;

      case "pong":
        break;
    }
  };

  const initWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(getSessionWsUrl());
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as ServerMessage;
          handleMsgRef.current?.(msg);
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        // Auto-reconnect if we were in an active session
        if (sessionRef.current.code) {
          reconnectTimerRef.current = setTimeout(initWs, 4000);
        }
      };

      ws.onerror = () => {
        // onclose will fire after this
      };
    } catch {
      setState(prev => ({ ...prev, error: "Could not connect to session server." }));
    }
  }, []);

  // Send helper — queues message when WS is open
  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(msg));
  }, []);

  // Forward local screen-state changes to session (master / operator)
  useEffect(() => {
    const unsub = subscribeScreenChanges(async () => {
      if (isApplyingRemoteRef.current) return;
      const s = sessionRef.current;
      if (!s.code) return;
      if (s.myRole !== "master" && s.myRole !== "operator") return;
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      try {
        const res = await fetch("/api/screen");
        const screenState = await res.json() as Record<string, unknown>;
        ws.send(JSON.stringify({ type: "screen_update", state: screenState }));
      } catch { /* ignore */ }
    });
    return unsub;
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    initWs();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [initWs]);

  // Public API
  const createSession = useCallback((displayName: string) => {
    setState(prev => ({ ...prev, status: "connecting", error: null }));
    send({ type: "create_session", displayName });
  }, [send]);

  const joinSession = useCallback((code: string, displayName: string) => {
    setState(prev => ({ ...prev, status: "connecting", error: null }));
    send({ type: "join_session", code, displayName });
  }, [send]);

  const leaveSession = useCallback(() => {
    send({ type: "leave_session" });
    setState(INITIAL_SESSION_STATE);
  }, [send]);

  const changeRole = useCallback((memberId: string, role: "operator" | "viewer") => {
    send({ type: "change_role", memberId, role });
  }, [send]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return { state, createSession, joinSession, leaveSession, changeRole, clearError };
}
