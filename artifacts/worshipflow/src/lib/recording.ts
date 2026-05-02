import { useSyncExternalStore } from "react";

export type RecState = "idle" | "recording";

interface RecordingSnapshot {
  state: RecState;
  duration: number;
  downloadUrl: string | null;
  includeMic: boolean;
  error: string | null;
}

let snapshot: RecordingSnapshot = {
  state: "idle",
  duration: 0,
  downloadUrl: null,
  includeMic: true,
  error: null,
};

let recRef: {
  recorder: MediaRecorder;
  chunks: Blob[];
  timer: ReturnType<typeof setInterval>;
  displayStream: MediaStream;
  micStream: MediaStream | null;
} | null = null;

let isStarting = false;

const listeners = new Set<() => void>();

function setState(patch: Partial<RecordingSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot() {
  return snapshot;
}

export function useRecording() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function setIncludeMic(value: boolean) {
  if (snapshot.state === "recording") return;
  setState({ includeMic: value });
}

export async function startRecording(): Promise<{ ok: boolean; error?: string }> {
  if (snapshot.state === "recording" || isStarting) {
    return { ok: false, error: "Already recording or starting" };
  }
  isStarting = true;

  if (snapshot.downloadUrl) {
    URL.revokeObjectURL(snapshot.downloadUrl);
    setState({ downloadUrl: null });
  }
  if (snapshot.error) setState({ error: null });

  let displayStream: MediaStream | null = null;
  let micStream: MediaStream | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  try {
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    } as DisplayMediaStreamOptions);

    let combinedStream: MediaStream = displayStream;

    if (snapshot.includeMic) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

        const ctx = new AudioContext();
        const dest = ctx.createMediaStreamDestination();

        const displayAudioTrack = displayStream.getAudioTracks()[0];
        if (displayAudioTrack) {
          ctx.createMediaStreamSource(new MediaStream([displayAudioTrack])).connect(dest);
        }
        ctx.createMediaStreamSource(micStream).connect(dest);

        combinedStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);
      } catch {
        combinedStream = displayStream;
      }
    }

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(combinedStream, { mimeType });

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = () => {
      try {
        if (recRef) {
          clearInterval(recRef.timer);
          recRef.displayStream.getTracks().forEach(t => t.stop());
          recRef.micStream?.getTracks().forEach(t => t.stop());
        }
      } catch {}
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      recRef = null;
      setState({ state: "idle", duration: 0, downloadUrl: url });
    };

    timer = setInterval(() => {
      setState({ duration: snapshot.duration + 1 });
    }, 1000);

    recRef = { recorder, chunks, timer, displayStream, micStream };
    recorder.start(1000);

    displayStream.getVideoTracks()[0].addEventListener("ended", () => {
      if (recRef?.recorder.state === "recording") recRef.recorder.stop();
    });

    setState({ state: "recording", duration: 0, downloadUrl: null, error: null });
    isStarting = false;
    return { ok: true };
  } catch (e) {
    if (timer) clearInterval(timer);
    displayStream?.getTracks().forEach(t => t.stop());
    micStream?.getTracks().forEach(t => t.stop());
    isStarting = false;
    if ((e as DOMException)?.name === "NotAllowedError") {
      return { ok: false, error: "Permission denied" };
    }
    const msg = "Could not start screen capture.";
    setState({ error: msg });
    return { ok: false, error: msg };
  }
}

export function stopRecording() {
  if (recRef?.recorder.state === "recording") {
    recRef.recorder.stop();
  }
}

export function clearDownload() {
  if (snapshot.downloadUrl) {
    URL.revokeObjectURL(snapshot.downloadUrl);
  }
  setState({ downloadUrl: null });
}
