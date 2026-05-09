export type MemberRole = "master" | "operator" | "viewer";

export interface SessionMember {
  id: string;
  displayName: string;
  role: MemberRole;
  connectedAt: number;
}

export interface ChatMessage {
  id: string;
  memberId: string;
  displayName: string;
  text: string;
  timestamp: number;
}

export interface LiveSessionState {
  status: "idle" | "connecting" | "connected" | "reconnecting" | "error";
  code: string | null;
  myId: string | null;
  myRole: MemberRole | null;
  members: SessionMember[];
  error: string | null;
}

export const INITIAL_SESSION_STATE: LiveSessionState = {
  status: "idle",
  code: null,
  myId: null,
  myRole: null,
  members: [],
  error: null,
};

export type ClientMessage =
  | { type: "create_session"; displayName: string }
  | { type: "join_session"; code: string; displayName: string }
  | { type: "leave_session" }
  | { type: "screen_update"; state: Record<string, unknown> }
  | { type: "change_role"; memberId: string; role: "operator" | "viewer" }
  | { type: "chat_message"; text: string }
  | { type: "signal"; targetId: string; payload: unknown }
  | { type: "ping" };

export type ServerMessage =
  | { type: "session_created"; code: string; myId: string; members: SessionMember[] }
  | { type: "session_joined"; code: string; myId: string; role: MemberRole; members: SessionMember[]; screenState: Record<string, unknown> }
  | { type: "session_left" }
  | { type: "member_joined"; member: SessionMember }
  | { type: "member_left"; memberId: string }
  | { type: "screen_update"; state: Record<string, unknown>; senderId: string }
  | { type: "role_changed"; memberId: string; role: MemberRole }
  | { type: "chat_message"; message: ChatMessage }
  | { type: "signal"; fromId: string; payload: unknown }
  | { type: "error"; message: string }
  | { type: "pong" };

export function getSessionWsUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/session/ws`;
}

export function getSessionShareUrl(code: string): string {
  const url = new URL(window.location.href);
  url.search = `?join=${code}`;
  url.hash = "";
  return url.toString();
}
