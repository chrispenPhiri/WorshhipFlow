import { useCallback, useEffect, useRef, useState } from "react";
import { type SessionMember } from "@/lib/live-session";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface SignalPayload {
  type: "mic-enabled" | "mic-disabled" | "offer" | "answer" | "ice-candidate";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export type PeerState = "connecting" | "connected" | "failed";

export function useWebRtcAudio(
  myId: string | null,
  members: SessionMember[],
  sendSignal: (targetId: string, payload: unknown) => void,
  setSignalHandler: (handler: (fromId: string, payload: unknown) => void) => void,
) {
  const [micEnabled, setMicEnabled] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [remoteMicIds, setRemoteMicIds] = useState<Set<string>>(new Set());
  const [peerStates, setPeerStates] = useState<Map<string, PeerState>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElemsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const updatePeerState = useCallback((id: string, state: PeerState | null) => {
    setPeerStates(prev => {
      const next = new Map(prev);
      if (state === null) next.delete(id);
      else next.set(id, state);
      return next;
    });
  }, []);

  const closePeer = useCallback((memberId: string) => {
    peersRef.current.get(memberId)?.close();
    peersRef.current.delete(memberId);
    const audio = audioElemsRef.current.get(memberId);
    if (audio) {
      audio.srcObject = null;
      audioElemsRef.current.delete(memberId);
    }
    updatePeerState(memberId, null);
  }, [updatePeerState]);

  const createPeer = useCallback((targetId: string, isInitiator: boolean): RTCPeerConnection => {
    closePeer(targetId);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current.set(targetId, pc);
    updatePeerState(targetId, "connecting");

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        pc.addTrack(track, localStreamRef.current);
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal(targetId, { type: "ice-candidate", candidate: e.candidate.toJSON() });
      }
    };

    pc.ontrack = (e) => {
      let audio = audioElemsRef.current.get(targetId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audioElemsRef.current.set(targetId, audio);
      }
      audio.srcObject = e.streams[0];
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") updatePeerState(targetId, "connected");
      else if (s === "failed" || s === "closed") {
        peersRef.current.delete(targetId);
        updatePeerState(targetId, s === "failed" ? "failed" : null);
      } else if (s === "connecting") {
        updatePeerState(targetId, "connecting");
      }
    };

    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer).then(() => offer))
        .then(offer => sendSignal(targetId, { type: "offer", sdp: offer }))
        .catch(() => { /* ignore */ });
    }

    return pc;
  }, [closePeer, sendSignal, updatePeerState]);

  const handleSignal = useCallback(async (fromId: string, payload: unknown) => {
    const p = payload as SignalPayload;
    if (!p?.type) return;

    if (p.type === "mic-enabled") {
      setRemoteMicIds(prev => new Set([...prev, fromId]));
      if (localStreamRef.current && myId && fromId !== myId) {
        createPeer(fromId, true);
      }
      return;
    }

    if (p.type === "mic-disabled") {
      setRemoteMicIds(prev => {
        const next = new Set(prev);
        next.delete(fromId);
        return next;
      });
      closePeer(fromId);
      return;
    }

    if (p.type === "offer" && p.sdp) {
      const pc = createPeer(fromId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal(fromId, { type: "answer", sdp: pc.localDescription ?? answer });
      return;
    }

    if (p.type === "answer" && p.sdp) {
      const pc = peersRef.current.get(fromId);
      if (pc && pc.signalingState !== "stable") {
        await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
      }
      return;
    }

    if (p.type === "ice-candidate" && p.candidate) {
      const pc = peersRef.current.get(fromId);
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(p.candidate)).catch(() => { /* ignore */ });
      }
      return;
    }
  }, [closePeer, createPeer, myId, sendSignal]);

  useEffect(() => {
    setSignalHandler(handleSignal);
  }, [setSignalHandler, handleSignal]);

  const enableMic = useCallback(async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setMicEnabled(true);
      if (myId) {
        for (const member of members) {
          if (member.id !== myId) {
            sendSignal(member.id, { type: "mic-enabled" });
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.name : "unknown";
      if (msg === "NotAllowedError" || msg === "PermissionDeniedError") {
        setMicError("Microphone access was denied. Please allow it in your browser settings and try again.");
      } else if (msg === "NotFoundError") {
        setMicError("No microphone found. Plug in a mic or headset and try again.");
      } else {
        setMicError("Could not start microphone. Check your browser permissions.");
      }
    }
  }, [members, myId, sendSignal]);

  const disableMic = useCallback(() => {
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) track.stop();
      localStreamRef.current = null;
    }
    for (const id of [...peersRef.current.keys()]) closePeer(id);
    setMicEnabled(false);
    setMicError(null);

    if (myId) {
      for (const member of members) {
        if (member.id !== myId) {
          sendSignal(member.id, { type: "mic-disabled" });
        }
      }
    }
  }, [closePeer, members, myId, sendSignal]);

  const toggleMic = useCallback(() => {
    if (micEnabled) disableMic();
    else void enableMic();
  }, [micEnabled, disableMic, enableMic]);

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) track.stop();
      }
      for (const id of [...peersRef.current.keys()]) {
        peersRef.current.get(id)?.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { micEnabled, micError, remoteMicIds, peerStates, toggleMic };
}
