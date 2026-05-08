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
import { getGetScreenStateQueryKey } from "@workspace/api-client-react";
import { subscribeScreenChanges } from "@/lib/local-api";

export function useLiveSession() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const sessionRef = useRef<LiveSessionState>(INITIAL_SESSION_STATE);
  // Queued message to send when the WS opens (create / join / rejoin)
  const pendingMsgRef = useRef<ClientMessage | null>(null);
  // Remember display name so we can auto-rejoin after a disconnect
  const displayNameRef = useRef<string>("");

  const [state, setState] = useState<LiveSessionState>(INITIAL_SESSION_STATE);

  useEffect(() => { sessionRef.current = state; }, [state]);

  // Apply a remote screen state to local IndexedDB without echoing back
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
      setTimeout(() => { isApplyingRemoteRef.current = false; }, 300);
    }
  }, [queryClient]);

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
          myRole: prev.myId === msg.memberId ? msg.role as MemberRole : prev.myRole,
          members: prev.members.map(m =>
            m.id === msg.memberId ? { ...m, role: msg.role as MemberRole } : m
          ),
        }));
        break;

      case "error":
        // If error arrives while reconnecting/connecting, go back to idle
        setState(prev => ({
          ...prev,
          status: (prev.status === "connecting" || prev.status === "reconnecting") ? "idle" : prev.status,
          code: (prev.status === "reconnecting") ? null : prev.code,
          myId: (prev.status === "reconnecting") ? null : prev.myId,
          myRole: (prev.status === "reconnecting") ? null : prev.myRole,
          members: (prev.status === "reconnecting") ? [] : prev.members,
          error: msg.message,
        }));
        pendingMsgRef.current = null;
        break;

      case "pong":
        break;
    }
  };

  // Use a ref so closures always call the latest initWs
  const initWsRef = useRef<() => void>(() => { /* placeholder */ });

  // Send immediately if open, otherwise queue and ensure we're connecting
  const sendOrQueue = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return;
    }
    pendingMsgRef.current = msg;
    if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      initWsRef.current();
    }
    // If CONNECTING, onopen will flush pendingMsgRef
  }, []);

  const initWs = useCallback(() => {
    const existing = wsRef.current;
    if (existing &&
      (existing.readyState === WebSocket.CONNECTING || existing.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      const ws = new WebSocket(getSessionWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        if (pendingMsgRef.current) {
          ws.send(JSON.stringify(pendingMsgRef.current));
          pendingMsgRef.current = null;
        }
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as ServerMessage;
          handleMsgRef.current?.(msg);
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        const s = sessionRef.current;
        const inSession = !!s.code;
        const hasPending = !!pendingMsgRef.current;

        if (inSession) {
          // Show disconnected state while we reconnect, preserving session info
          setState(prev => ({ ...prev, status: "reconnecting" }));
          // Queue an auto-rejoin so the server re-associates this WS with the room
          pendingMsgRef.current = {
            type: "join_session",
            code: s.code!,
            displayName: displayNameRef.current || "Member",
          };
        }

        if (inSession || hasPending) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 8000);
          reconnectAttemptsRef.current = Math.min(reconnectAttemptsRef.current + 1, 5);
          reconnectTimerRef.current = setTimeout(() => initWsRef.current(), delay);
        }
      };

      ws.onerror = () => { /* onclose fires after this */ };
    } catch {
      setState(prev => ({ ...prev, status: "idle", error: "Could not reach session server." }));
    }
  }, []);

  useEffect(() => { initWsRef.current = initWs; }, [initWs]);

  // Forward local screen-state changes to the session (master / operator only)
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

  // Connect on mount, clean up on unmount
  useEffect(() => {
    initWs();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      pendingMsgRef.current = null;
      wsRef.current?.close();
    };
  }, [initWs]);

  const createSession = useCallback((displayName: string) => {
    displayNameRef.current = displayName;
    setState(prev => ({ ...prev, status: "connecting", error: null }));
    sendOrQueue({ type: "create_session", displayName });
  }, [sendOrQueue]);

  const joinSession = useCallback((code: string, displayName: string) => {
    displayNameRef.current = displayName;
    setState(prev => ({ ...prev, status: "connecting", error: null }));
    sendOrQueue({ type: "join_session", code, displayName });
  }, [sendOrQueue]);

  const leaveSession = useCallback(() => {
    pendingMsgRef.current = null;
    displayNameRef.current = "";
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "leave_session" }));
    }
    setState(INITIAL_SESSION_STATE);
  }, []);

  const changeRole = useCallback((memberId: string, role: "operator" | "viewer") => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "change_role", memberId, role }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return { state, createSession, joinSession, leaveSession, changeRole, clearError };
}
