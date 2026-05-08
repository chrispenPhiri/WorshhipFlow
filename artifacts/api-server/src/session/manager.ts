import { WebSocket } from "ws";
import { logger } from "../lib/logger";

export type MemberRole = "master" | "operator" | "viewer";

export interface Member {
  id: string;
  displayName: string;
  role: MemberRole;
  ws: WebSocket;
  connectedAt: number;
  lastPing: number;
}

export interface Session {
  code: string;
  masterId: string;
  members: Map<string, Member>;
  screenState: Record<string, unknown>;
  createdAt: number;
  lastActivity: number;
}

const sessions = new Map<string, Session>();
const wsToSession = new Map<WebSocket, { sessionCode: string; memberId: string }>();

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

function uniqueCode(): string {
  let code = randomCode();
  let attempts = 0;
  while (sessions.has(code) && attempts < 100) { code = randomCode(); attempts++; }
  return code;
}

export function sendTo(ws: WebSocket, message: unknown): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  try { ws.send(JSON.stringify(message)); } catch { /* ignore */ }
}

export function broadcast(session: Session, message: unknown, excludeId?: string): void {
  const payload = JSON.stringify(message);
  for (const member of session.members.values()) {
    if (member.id !== excludeId && member.ws.readyState === WebSocket.OPEN) {
      try { member.ws.send(payload); } catch { /* ignore */ }
    }
  }
}

export function getMembersSnapshot(session: Session) {
  return [...session.members.values()].map(m => ({
    id: m.id,
    displayName: m.displayName,
    role: m.role,
    connectedAt: m.connectedAt,
  }));
}

export function createSession(ws: WebSocket, displayName: string): Session {
  const code = uniqueCode();
  const memberId = crypto.randomUUID();
  const member: Member = {
    id: memberId,
    displayName: displayName.slice(0, 40) || "Master",
    role: "master",
    ws,
    connectedAt: Date.now(),
    lastPing: Date.now(),
  };
  const session: Session = {
    code,
    masterId: memberId,
    members: new Map([[memberId, member]]),
    screenState: {},
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
  sessions.set(code, session);
  wsToSession.set(ws, { sessionCode: code, memberId });
  logger.info({ code, masterId: memberId }, "Session created");
  return session;
}

export function joinSession(
  ws: WebSocket, code: string, displayName: string,
): { session: Session; member: Member } | { error: string } {
  const session = sessions.get(code.toUpperCase().trim());
  if (!session) return { error: "Session not found. Check the code and try again." };
  if (session.members.size >= 20) return { error: "Session is full (max 20 participants)." };
  const memberId = crypto.randomUUID();
  const member: Member = {
    id: memberId,
    displayName: displayName.slice(0, 40) || "Member",
    role: "viewer",
    ws,
    connectedAt: Date.now(),
    lastPing: Date.now(),
  };
  session.members.set(memberId, member);
  session.lastActivity = Date.now();
  wsToSession.set(ws, { sessionCode: code.toUpperCase().trim(), memberId });
  logger.info({ code, memberId, displayName }, "Member joined session");
  return { session, member };
}

export function leaveSession(ws: WebSocket): {
  session: Session; memberId: string; newMasterId?: string;
} | null {
  const info = wsToSession.get(ws);
  if (!info) return null;
  wsToSession.delete(ws);
  const session = sessions.get(info.sessionCode);
  if (!session) return null;
  session.members.delete(info.memberId);
  let newMasterId: string | undefined;
  if (info.memberId === session.masterId && session.members.size > 0) {
    const next = [...session.members.values()].find(m => m.role === "operator")
      ?? [...session.members.values()][0];
    next.role = "master";
    session.masterId = next.id;
    newMasterId = next.id;
    logger.info({ code: info.sessionCode, newMasterId }, "Master transferred");
  }
  if (session.members.size === 0) {
    sessions.delete(info.sessionCode);
    logger.info({ code: info.sessionCode }, "Session ended");
  } else {
    session.lastActivity = Date.now();
  }
  return { session, memberId: info.memberId, newMasterId };
}

export function getSessionInfo(ws: WebSocket): { session: Session; member: Member } | null {
  const info = wsToSession.get(ws);
  if (!info) return null;
  const session = sessions.get(info.sessionCode);
  if (!session) return null;
  const member = session.members.get(info.memberId);
  if (!member) return null;
  return { session, member };
}

export function startCleanupJob(): NodeJS.Timeout {
  return setInterval(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [code, session] of sessions) {
      if (session.lastActivity < cutoff) {
        sessions.delete(code);
        logger.info({ code }, "Session expired");
      }
    }
  }, 60 * 60 * 1000);
}
