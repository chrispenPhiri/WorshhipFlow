/**
 * Persistent media library using a dedicated IndexedDB database.
 * Stores binary files (images, video, audio, PDFs, presentations, song files)
 * as ArrayBuffers so they survive page refreshes and work fully offline.
 *
 * Uses a separate DB ("wf-media-library") to avoid bumping the main
 * wf-local-api schema version and touching the complex multi-store setup.
 */

const DB_NAME = "wf-media-library";
const DB_VERSION = 1;
const STORE = "files";

export type MediaCategory = "image" | "video" | "audio" | "document" | "presentation" | "song";

export interface MediaFile {
  id: string;
  name: string;
  category: MediaCategory;
  mimeType: string;
  size: number;
  /** Raw binary content */
  data: ArrayBuffer;
  /** ISO timestamp */
  addedAt: string;
  /** Optional operator-assigned tags */
  tags?: string[];
}

/** MediaFile without the binary data — for listing / UI display */
export type MediaFileMeta = Omit<MediaFile, "data">;

let _db: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (_db) return _db;
  _db = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("category", "category", { unique: false });
        store.createIndex("addedAt", "addedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _db;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

/** Add a File object to the library. Returns the saved metadata. */
export async function addMediaFile(file: File, tags?: string[]): Promise<MediaFileMeta> {
  const db = await openDb();
  const data = await file.arrayBuffer();
  const record: MediaFile = {
    id: `mf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    category: inferCategory(file),
    mimeType: file.type,
    size: file.size,
    data,
    addedAt: new Date().toISOString(),
    tags,
  };
  await wrap(db.transaction(STORE, "readwrite").objectStore(STORE).put(record));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: _d, ...meta } = record;
  return meta;
}

/** List all files (metadata only — no binary). Optionally filter by category. */
export async function listMediaFiles(category?: MediaCategory): Promise<MediaFileMeta[]> {
  const db = await openDb();
  const store = db.transaction(STORE, "readonly").objectStore(STORE);
  const all = await wrap<MediaFile[]>(category
    ? store.index("category").getAll(category)
    : store.getAll());
  return all
    .map(({ data: _d, ...meta }) => meta)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

/** Get a single file with its binary data. */
export async function getMediaFile(id: string): Promise<MediaFile | undefined> {
  const db = await openDb();
  return wrap<MediaFile | undefined>(
    db.transaction(STORE, "readonly").objectStore(STORE).get(id),
  );
}

/** Delete a file by id. */
export async function deleteMediaFile(id: string): Promise<void> {
  const db = await openDb();
  await wrap(db.transaction(STORE, "readwrite").objectStore(STORE).delete(id));
}

/** Create a temporary object URL from a stored file. Caller must revoke when done. */
export async function createObjectUrl(id: string): Promise<string | null> {
  const file = await getMediaFile(id);
  if (!file) return null;
  const blob = new Blob([file.data], { type: file.mimeType });
  return URL.createObjectURL(blob);
}

/** Get a data URL (base64) — needed for sending images to the broadcast window. */
export async function getDataUrl(id: string): Promise<string | null> {
  const file = await getMediaFile(id);
  if (!file) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(new Blob([file.data], { type: file.mimeType }));
  });
}

/** Human-readable file size. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"]);
const AUDIO_TYPES = new Set(["audio/mpeg", "audio/ogg", "audio/wav", "audio/flac", "audio/aac", "audio/x-m4a"]);
const PRESO_TYPES = new Set(["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.apple.keynote"]);
const SONG_EXTS = new Set([".opensong", ".cho", ".chordpro", ".onsong", ".ovp"]);
const DOC_TYPES = new Set(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]);

export function inferCategory(file: File): MediaCategory {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (SONG_EXTS.has(ext)) return "song";
  if (IMAGE_TYPES.has(file.type)) return "image";
  if (VIDEO_TYPES.has(file.type)) return "video";
  if (AUDIO_TYPES.has(file.type)) return "audio";
  if (PRESO_TYPES.has(file.type)) return "presentation";
  if (DOC_TYPES.has(file.type)) return "document";
  return "document";
}

export const CATEGORY_ACCEPT: Record<MediaCategory, string> = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
  document: ".pdf,.doc,.docx,.txt",
  presentation: ".ppt,.pptx,.key",
  song: ".opensong,.cho,.chordpro,.onsong,.ovp,.txt",
};

export const CATEGORY_LABELS: Record<MediaCategory, string> = {
  image: "Images",
  video: "Videos",
  audio: "Audio",
  document: "Documents",
  presentation: "Presentations",
  song: "Song Files",
};

export const ALL_ACCEPT =
  "image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.key,.opensong,.cho,.chordpro,.onsong,.ovp,.txt";
