import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Trash2, Search, Image as ImageIcon, Video, Music, FileText,
  Presentation, Music2, FolderOpen, Play, X, Download, Send, Eye,
  RefreshCw, Filter, ChevronDown, File,
} from "lucide-react";
import {
  addMediaFile, listMediaFiles, deleteMediaFile, createObjectUrl, getDataUrl,
  formatSize, ALL_ACCEPT, CATEGORY_LABELS,
  type MediaCategory, type MediaFileMeta,
} from "@/lib/media-library";
import { useUpdateScreenState } from "@workspace/api-client-react";
import { toast } from "sonner";

const CATEGORY_ICONS: Record<MediaCategory | "all", React.ReactNode> = {
  all: <FolderOpen className="w-4 h-4" />,
  image: <ImageIcon className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  audio: <Music className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  presentation: <Presentation className="w-4 h-4" />,
  song: <Music2 className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<MediaCategory, string> = {
  image: "#3b82f6",
  video: "#ef4444",
  audio: "#a855f7",
  document: "#f97316",
  presentation: "#22c55e",
  song: "#eab308",
};

function FileThumbnail({ file, objectUrl }: { file: MediaFileMeta; objectUrl?: string }) {
  if (file.category === "image" && objectUrl) {
    return (
      <img
        src={objectUrl}
        alt={file.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    );
  }
  if (file.category === "video" && objectUrl) {
    return (
      <video
        src={objectUrl}
        className="w-full h-full object-cover"
        muted
        preload="metadata"
      />
    );
  }
  const color = CATEGORY_COLORS[file.category] ?? "#94a3b8";
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1" style={{ color }}>
      <File className="w-8 h-8" />
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
        {file.name.split(".").pop()?.toUpperCase() ?? "FILE"}
      </span>
    </div>
  );
}

function FileCard({
  file,
  onDelete,
  onSendToScreen,
  onPreview,
}: {
  file: MediaFileMeta;
  onDelete: (id: string) => void;
  onSendToScreen: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | undefined>();

  useEffect(() => {
    let url: string | null = null;
    if (file.category === "image" || file.category === "video") {
      createObjectUrl(file.id).then((u) => { url = u; if (u) setObjectUrl(u); });
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [file.id, file.category]);

  const canSendToScreen = file.category === "image" || file.category === "video";

  return (
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors">
      {/* Thumbnail area */}
      <div className="aspect-video bg-muted/30 relative overflow-hidden">
        <FileThumbnail file={file} objectUrl={objectUrl} />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {canSendToScreen && (
            <button
              type="button"
              onClick={() => onSendToScreen(file.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              title="Send to screen"
            >
              <Send className="w-3 h-3" /> Send
            </button>
          )}
          <button
            type="button"
            onClick={() => onPreview(file.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-medium hover:bg-white/30 transition-colors"
            title="Preview"
          >
            <Eye className="w-3 h-3" /> View
          </button>
        </div>
      </div>

      {/* Info strip */}
      <div className="px-3 py-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate" title={file.name}>{file.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{formatSize(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(file.id)}
          className="shrink-0 mt-0.5 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Category badge */}
      <div
        className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
        style={{
          background: `${CATEGORY_COLORS[file.category]}22`,
          color: CATEGORY_COLORS[file.category],
          border: `1px solid ${CATEGORY_COLORS[file.category]}44`,
        }}
      >
        {file.category}
      </div>
    </div>
  );
}

function PreviewModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<MediaFileMeta | null>(null);

  useEffect(() => {
    listMediaFiles().then((all) => {
      const m = all.find((f) => f.id === id);
      if (m) setMeta(m);
    });
    createObjectUrl(id).then(setUrl);
    return () => { if (url) URL.revokeObjectURL(url); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
        {url && meta?.category === "image" && (
          <img src={url} alt={meta?.name} className="rounded-xl max-h-[85vh] object-contain" />
        )}
        {url && meta?.category === "video" && (
          <video src={url} controls autoPlay className="rounded-xl max-h-[85vh]" />
        )}
        {url && meta?.category === "audio" && (
          <div className="bg-card rounded-xl p-8 flex flex-col items-center gap-4">
            <Music className="w-16 h-16 text-primary" />
            <p className="text-sm font-medium">{meta?.name}</p>
            <audio src={url} controls className="w-full" />
          </div>
        )}
        {url && (meta?.category === "document" || meta?.category === "presentation") && (
          <div className="bg-card rounded-xl overflow-hidden flex flex-col w-full" style={{ height: "85vh" }}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <p className="text-sm font-medium truncate">{meta?.name}</p>
              </div>
              <a
                href={url}
                download={meta?.name}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs text-muted-foreground transition-colors shrink-0 ml-2"
                onClick={e => e.stopPropagation()}
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>
            <object
              data={url}
              type={meta?.name?.toLowerCase().endsWith(".pdf") ? "application/pdf" : undefined}
              className="flex-1 w-full"
              aria-label={meta?.name}
            >
              <iframe
                src={url}
                className="w-full h-full border-0"
                title={meta?.name}
              />
            </object>
          </div>
        )}
        {url && meta?.category === "song" && (
          <SongFileViewer url={url} name={meta?.name ?? ""} />
        )}
      </div>
    </div>
  );
}

function SongFileViewer({ url, name }: { url: string; name: string }) {
  const [content, setContent] = useState<string>("");
  useEffect(() => {
    fetch(url).then((r) => r.text()).then(setContent).catch(() => setContent("(Unable to read file)"));
  }, [url]);
  return (
    <div className="bg-card rounded-xl p-6 max-h-[85vh] overflow-y-auto">
      <h3 className="font-semibold mb-4">{name}</h3>
      <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">{content}</pre>
    </div>
  );
}

export default function LibraryPage() {
  const [files, setFiles] = useState<MediaFileMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<MediaCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: updateScreen } = useUpdateScreenState();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listMediaFiles();
      setFiles(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    let added = 0;
    for (const file of Array.from(fileList)) {
      try {
        await addMediaFile(file);
        added++;
      } catch (err) {
        console.warn("Failed to add file", file.name, err);
        toast.error(`Failed to add ${file.name}`);
      }
    }
    setUploading(false);
    if (added > 0) {
      toast.success(`${added} file${added > 1 ? "s" : ""} added to library`);
      await refresh();
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMediaFile(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    toast.success("File removed from library");
  };

  const handleSendToScreen = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;
    try {
      if (file.category === "image") {
        const dataUrl = await getDataUrl(id);
        if (!dataUrl) return;
        await updateScreen({
          data: {
            isLive: true, isBlack: false, isClear: false,
            contentType: "image" as const,
            background: { type: "image", value: dataUrl, overlay: 0, fit: "cover" } as never,
          },
        });
        toast.success("Image sent to screen");
      } else if (file.category === "video") {
        const objectUrl = await createObjectUrl(id);
        if (!objectUrl) return;
        await updateScreen({
          data: {
            isLive: true, isBlack: false, isClear: false,
            contentType: "image" as const,
            background: { type: "video", value: objectUrl, loop: true, overlay: 0 } as never,
          },
        });
        toast.success("Video sent to screen");
      }
    } catch {
      toast.error("Failed to send to screen");
    }
  };

  const filtered = files.filter((f) => {
    const matchesCat = activeCategory === "all" || f.category === activeCategory;
    const matchesSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const categoryCounts = files.reduce<Record<string, number>>((acc, f) => {
    acc[f.category] = (acc[f.category] ?? 0) + 1;
    return acc;
  }, {});

  const categories: (MediaCategory | "all")[] = ["all", "image", "video", "audio", "document", "presentation", "song"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Media Library</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Upload and manage images, videos, audio, documents, presentations, and song files — stored locally on this device.
        </p>
      </div>

      {/* Upload drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      >
        <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            {uploading ? (
              <RefreshCw className="w-7 h-7 text-primary animate-spin" />
            ) : (
              <Upload className="w-7 h-7 text-primary" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">Drop files here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">
              Images, videos, audio, PDFs, PowerPoint, song files — all stored offline on your device
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            {uploading ? "Uploading…" : "Browse files"}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALL_ACCEPT}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const count = cat === "all" ? files.length : (categoryCounts[cat] ?? 0);
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  active
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "text-muted-foreground border-border hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                {CATEGORY_ICONS[cat]}
                <span>{cat === "all" ? "All" : CATEGORY_LABELS[cat as MediaCategory]}</span>
                {count > 0 && (
                  <span className={`px-1 py-0 rounded text-[10px] ${active ? "bg-primary/20" : "bg-muted"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 ml-auto"
          onClick={refresh}
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* File grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading library…</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center">
              <FolderOpen className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">
                {search ? "No files match your search" : files.length === 0 ? "Your library is empty" : "No files in this category"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {files.length === 0
                  ? "Drop files above to add them to your local library"
                  : "Try a different filter or search term"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={handleDelete}
              onSendToScreen={handleSendToScreen}
              onPreview={setPreviewId}
            />
          ))}
        </div>
      )}

      {/* Storage info */}
      {files.length > 0 && (
        <p className="text-[11px] text-muted-foreground text-center pb-2">
          {files.length} file{files.length !== 1 ? "s" : ""} ·{" "}
          {formatSize(files.reduce((s, f) => s + f.size, 0))} stored locally on this device
        </p>
      )}

      {/* Preview modal */}
      {previewId && (
        <PreviewModal id={previewId} onClose={() => setPreviewId(null)} />
      )}
    </div>
  );
}
