/**
 * Live Queue — localStorage-backed ordered list of items to present.
 * Each item stores enough metadata to display in the queue UI, plus a
 * reference (mediaId) or inline payload (bible text / custom text) so we
 * can reconstruct the screen state when the operator clicks "Go Live".
 */

export type QueueItemKind = "image" | "video" | "audio" | "bible" | "text" | "song";

export interface QueueItem {
  id: string;
  kind: QueueItemKind;
  label: string;
  /** Small data-URL thumbnail (max ~200px) shown in the queue card. */
  thumbnail?: string;
  /** Reference to a wf-media-library entry (for image/video/audio/song). */
  mediaId?: string;
  /** Inline text content (for bible / custom text items). */
  text?: string;
  /** Sub-label shown in smaller text (e.g. "John 3:16" under the verse). */
  subLabel?: string;
}

const STORAGE_KEY = "wf-live-queue";

export function loadQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

export function saveQueue(items: QueueItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage quota — silently ignore
  }
}

export function generateQueueId(): string {
  return `qi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Resize an image data-URL to a small thumbnail for queue display. */
export async function makeThumbnail(dataUrl: string, maxPx = 180): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
