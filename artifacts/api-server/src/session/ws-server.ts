import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import * as mgr from "./manager";
import { logger } from "../lib/logger";

export function attachWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: "/api/session/ws" });
  mgr.startCleanupJob();

  wss.on("connection", (ws) => {
    const heartbeat = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) { clearInterval(heartbeat); return; }
      ws.ping();
    }, 25000);

    ws.on("pong", () => {
      const info = mgr.getSessionInfo(ws);
      if (info) info.member.lastPing = Date.now();
    });

    ws.on("message", (raw) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(raw.toString()); } catch {
        mgr.sendTo(ws, { type: "error", message: "Invalid JSON" });
        return;
      }

      switch (msg["type"]) {
        case "create_session": {
          if (mgr.getSessionInfo(ws)) {
            mgr.sendTo(ws, { type: "error", message: "Already in a session." });
            return;
          }
          const displayName = String(msg["displayName"] ?? "Master");
          const session = mgr.createSession(ws, displayName);
          const master = session.members.get(session.masterId)!;
          mgr.sendTo(ws, {
            type: "session_created",
            code: session.code,
            masterKey: session.masterKey,
            myId: master.id,
            members: mgr.getMembersSnapshot(session),
          });
          break;
        }

        case "join_session": {
          if (mgr.getSessionInfo(ws)) {
            mgr.sendTo(ws, { type: "error", message: "Already in a session." });
            return;
          }
          const code = String(msg["code"] ?? "").toUpperCase().trim();
          const displayName = String(msg["displayName"] ?? "Member");
          const masterKey = msg["masterKey"] as string | undefined;
          const result = mgr.joinSession(ws, code, displayName, masterKey);
          if ("error" in result) {
            mgr.sendTo(ws, { type: "error", message: result.error });
            return;
          }
          const { session, member, demotedMasterId } = result;
          mgr.sendTo(ws, {
            type: "session_joined",
            code: session.code,
            myId: member.id,
            role: member.role,
            members: mgr.getMembersSnapshot(session),
            screenState: session.screenState,
          });
          mgr.broadcast(session, {
            type: "member_joined",
            member: {
              id: member.id,
              displayName: member.displayName,
              role: member.role,
              connectedAt: member.connectedAt,
            },
          }, member.id);
          // If master was reclaimed, tell the temporarily-promoted member they're now operator
          if (demotedMasterId) {
            mgr.broadcast(session, {
              type: "role_changed",
              memberId: demotedMasterId,
              role: "operator",
            });
          }
          break;
        }

        case "leave_session": {
          const result = mgr.leaveSession(ws);
          mgr.sendTo(ws, { type: "session_left" });
          if (result && result.session.members.size > 0) {
            mgr.broadcast(result.session, { type: "member_left", memberId: result.memberId });
            if (result.newMasterId) {
              mgr.broadcast(result.session, { type: "role_changed", memberId: result.newMasterId, role: "master" });
            }
          }
          break;
        }

        case "screen_update": {
          const info = mgr.getSessionInfo(ws);
          if (!info) return;
          const { session, member } = info;
          if (member.role === "viewer") {
            mgr.sendTo(ws, { type: "error", message: "Viewers cannot update the screen." });
            return;
          }
          const state = msg["state"] as Record<string, unknown>;
          session.screenState = state;
          session.lastActivity = Date.now();
          mgr.broadcast(session, { type: "screen_update", state, senderId: member.id }, member.id);
          break;
        }

        case "change_role": {
          const info = mgr.getSessionInfo(ws);
          if (!info) return;
          const { session, member } = info;
          if (member.role !== "master") {
            mgr.sendTo(ws, { type: "error", message: "Only the master can change roles." });
            return;
          }
          const targetId = String(msg["memberId"] ?? "");
          const newRole = msg["role"] as mgr.MemberRole;
          if (!["operator", "viewer"].includes(newRole)) return;
          const target = session.members.get(targetId);
          if (!target || target.role === "master") return;
          target.role = newRole;
          mgr.broadcast(session, { type: "role_changed", memberId: targetId, role: newRole });
          break;
        }

        case "chat_message": {
          const info = mgr.getSessionInfo(ws);
          if (!info) return;
          const { session, member } = info;
          const text = String(msg["text"] ?? "").trim().slice(0, 500);
          if (!text) return;
          const chatMsg = {
            id: crypto.randomUUID(),
            memberId: member.id,
            displayName: member.displayName,
            text,
            timestamp: Date.now(),
          };
          mgr.broadcast(session, { type: "chat_message", message: chatMsg });
          mgr.sendTo(ws, { type: "chat_message", message: chatMsg });
          break;
        }

        case "signal": {
          const info = mgr.getSessionInfo(ws);
          if (!info) return;
          const { session, member } = info;
          const targetId = String(msg["targetId"] ?? "");
          const target = session.members.get(targetId);
          if (target) {
            mgr.sendTo(target.ws, { type: "signal", fromId: member.id, payload: msg["payload"] });
          }
          break;
        }

        case "ping": {
          mgr.sendTo(ws, { type: "pong" });
          break;
        }

        default:
          logger.warn({ msgType: msg["type"] }, "Unknown WS message type");
      }
    });

    ws.on("close", () => {
      clearInterval(heartbeat);
      const result = mgr.leaveSession(ws);
      if (result && result.session.members.size > 0) {
        mgr.broadcast(result.session, { type: "member_left", memberId: result.memberId });
        if (result.newMasterId) {
          mgr.broadcast(result.session, { type: "role_changed", memberId: result.newMasterId, role: "master" });
        }
      }
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WebSocket client error");
    });
  });

  logger.info("WebSocket session server attached at /api/session/ws");
  return wss;
}
