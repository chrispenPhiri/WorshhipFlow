import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateSong,
  getListSongsQueryKey,
  getGetSongStatsQueryKey,
  CreateSongBodyCategory,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Upload,
  Download,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "hymn",
  "worship",
  "gospel",
  "contemporary",
  "christmas",
  "shona",
  "ndebele",
  "other",
] as const;
type Category = (typeof CATEGORIES)[number];

interface ParsedSong {
  title: string;
  author: string;
  category: Category;
  lyrics: string;
  key?: string;
  tempo?: string;
  tags?: string[];
}

interface ParseResult {
  songs: ParsedSong[];
  errors: string[];
  source: "json" | "csv";
}

const TEMPLATE_JSON: ParsedSong[] = [
  {
    title: "Amazing Grace",
    author: "John Newton",
    category: "hymn",
    key: "G major",
    tempo: "Slow",
    tags: ["traditional", "salvation"],
    lyrics:
      "[Verse 1]\nAmazing grace, how sweet the sound\nThat saved a wretch like me\nI once was lost, but now am found\nWas blind, but now I see\n\n[Chorus]\nMy chains are gone, I've been set free\nMy God, my Saviour has ransomed me\n\n[Verse 2]\n'Twas grace that taught my heart to fear\nAnd grace my fears relieved",
  },
  {
    title: "10,000 Reasons (Bless the Lord)",
    author: "Matt Redman",
    category: "worship",
    key: "G major",
    tempo: "Medium",
    tags: ["modern", "praise"],
    lyrics:
      "[Chorus]\nBless the Lord, O my soul, O my soul\nWorship His holy name\nSing like never before, O my soul\nI'll worship Your holy name\n\n[Verse 1]\nThe sun comes up, it's a new day dawning\nIt's time to sing Your song again\nWhatever may pass, and whatever lies before me\nLet me be singing when the evening comes",
  },
];

const TEMPLATE_CSV =
  'title,author,category,key,tempo,tags,lyrics\n' +
  '"Amazing Grace","John Newton",hymn,"G major",Slow,"traditional;salvation","[Verse 1]\nAmazing grace, how sweet the sound\nThat saved a wretch like me\n\n[Chorus]\nMy chains are gone, I\'ve been set free"\n' +
  '"10,000 Reasons","Matt Redman",worship,"G major",Medium,"modern;praise","[Chorus]\nBless the Lord, O my soul\nWorship His holy name"\n';

function isCategory(s: string): s is Category {
  return (CATEGORIES as readonly string[]).includes(s);
}

function normalizeRecord(
  r: Record<string, unknown>,
  lineLabel: string,
  errors: string[],
): ParsedSong | null {
  const title = String(r.title ?? "").trim();
  const author = String(r.author ?? "").trim();
  const lyrics = String(r.lyrics ?? "").trim();
  if (!title || !author || !lyrics) {
    errors.push(`${lineLabel}: missing title, author or lyrics — skipped.`);
    return null;
  }
  const rawCat = String(r.category ?? "other").trim().toLowerCase();
  const category: Category = isCategory(rawCat) ? rawCat : "other";
  const key = r.key ? String(r.key).trim() || undefined : undefined;
  const tempo = r.tempo ? String(r.tempo).trim() || undefined : undefined;
  let tags: string[] | undefined;
  if (Array.isArray(r.tags)) {
    tags = r.tags.map((t) => String(t).trim()).filter(Boolean);
  } else if (typeof r.tags === "string" && r.tags.trim()) {
    tags = r.tags
      .split(/[;|]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return { title, author, category, lyrics, key, tempo, tags };
}

function parseJson(text: string): ParseResult {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return {
      songs: [],
      errors: ["Invalid JSON: " + (e as Error).message],
      source: "json",
    };
  }
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  const songs: ParsedSong[] = [];
  arr.forEach((item, i) => {
    if (!item || typeof item !== "object") {
      errors.push(`Item ${i + 1}: not an object — skipped.`);
      return;
    }
    const s = normalizeRecord(
      item as Record<string, unknown>,
      `Item ${i + 1}`,
      errors,
    );
    if (s) songs.push(s);
  });
  return { songs, errors, source: "json" };
}

// RFC 4180-ish CSV parser supporting quoted fields with embedded newlines
// and "" escapes.
function parseCsv(text: string): ParseResult {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (c === "\r") {
        // skip; handled when \n arrives
      } else {
        cell += c;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const errors: string[] = [];
  // Drop trailing fully-blank rows (e.g. trailing newline at EOF).
  while (
    rows.length > 0 &&
    rows[rows.length - 1]!.every((c) => c.trim() === "")
  ) {
    rows.pop();
  }
  if (rows.length < 2) {
    return {
      songs: [],
      errors: ["CSV is empty or has no data rows."],
      source: "csv",
    };
  }
  // Strip UTF-8 BOM from the first header cell, common in spreadsheet exports.
  const header = rows[0]!.map((h, i) =>
    (i === 0 ? h.replace(/^\uFEFF/, "") : h).trim().toLowerCase(),
  );
  if (inQuotes) {
    errors.push(
      "Unterminated quoted field — the file may be malformed; some rows may have been merged.",
    );
  }
  const songs: ParsedSong[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]!;
    if (r.length === 1 && r[0]!.trim() === "") continue;
    const rec: Record<string, string> = {};
    header.forEach((h, idx) => {
      rec[h] = r[idx] ?? "";
    });
    const s = normalizeRecord(rec, `Row ${i + 1}`, errors);
    if (s) songs.push(s);
  }
  return { songs, errors, source: "csv" };
}

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SongImportDialog() {
  const [open, setOpen] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [fileKey, setFileKey] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync: createSong } = useCreateSong();
  // Monotonic run-id guards stale async completions from updating newer state
  // (e.g. after the user closes/reopens the dialog or picks a different file).
  const sessionId = useRef(0);

  function reset() {
    sessionId.current++;
    setParseResult(null);
    setImportedCount(0);
    setImporting(false);
    setFileKey((k) => k + 1);
  }

  async function handleFile(file: File) {
    sessionId.current++;
    const myRun = sessionId.current;
    setParseResult(null);
    setImportedCount(0);
    const text = await file.text();
    if (myRun !== sessionId.current) return; // stale read — ignore
    const ext = file.name.toLowerCase().split(".").pop();
    let result: ParseResult;
    if (ext === "json") result = parseJson(text);
    else if (ext === "csv") result = parseCsv(text);
    else if (text.trim().startsWith("[") || text.trim().startsWith("{"))
      result = parseJson(text);
    else result = parseCsv(text);
    setParseResult(result);
    if (result.songs.length === 0) {
      toast({
        title: "No songs found in file",
        description: result.errors[0] ?? "Check the file format and try again.",
        variant: "destructive",
      });
    }
  }

  async function handleImport() {
    if (!parseResult || parseResult.songs.length === 0) return;
    sessionId.current++;
    const myRun = sessionId.current;
    setImporting(true);
    let success = 0;
    let failed = 0;
    for (const song of parseResult.songs) {
      try {
        await createSong({
          data: {
            title: song.title,
            author: song.author,
            category: song.category as CreateSongBodyCategory,
            lyrics: song.lyrics,
            key: song.key,
            tempo: song.tempo,
            tags: song.tags,
          },
        });
        success++;
        if (myRun === sessionId.current) setImportedCount(success);
      } catch {
        failed++;
      }
    }
    queryClient.invalidateQueries({ queryKey: getListSongsQueryKey({}) });
    queryClient.invalidateQueries({ queryKey: getGetSongStatsQueryKey() });
    if (myRun !== sessionId.current) return; // user moved on — don't toast/close
    setImporting(false);
    if (failed === 0) {
      toast({
        title: `Imported ${success} song${success === 1 ? "" : "s"}`,
      });
      setOpen(false);
      reset();
    } else {
      toast({
        title: `Imported ${success}, ${failed} failed`,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (importing && !v) return; // don't allow close while importing
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-open-import-songs">
          <Upload className="w-4 h-4 mr-2" /> Import
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-2xl"
        onInteractOutside={(e) => {
          if (importing) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (importing) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Import Songs</DialogTitle>
          <DialogDescription>
            Upload a JSON or CSV file with one or more songs. Download a
            template below to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Download className="w-4 h-4 text-primary" />
              1. Get a template
            </div>
            <p className="text-xs text-muted-foreground">
              Templates include two example songs with section markers like{" "}
              <code className="px-1 py-0.5 rounded bg-muted">[Verse 1]</code>{" "}
              and{" "}
              <code className="px-1 py-0.5 rounded bg-muted">[Chorus]</code>.
              Fill in your own and upload below.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                data-testid="button-download-json-template"
                onClick={() =>
                  downloadFile(
                    "songs-template.json",
                    JSON.stringify(TEMPLATE_JSON, null, 2),
                    "application/json",
                  )
                }
              >
                <FileJson className="w-4 h-4 mr-2" /> JSON template
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-testid="button-download-csv-template"
                onClick={() =>
                  downloadFile(
                    "songs-template.csv",
                    TEMPLATE_CSV,
                    "text/csv;charset=utf-8",
                  )
                }
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV template
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Required fields: <code>title</code>, <code>author</code>,{" "}
              <code>lyrics</code>. Optional: <code>category</code>{" "}
              ({CATEGORIES.join(", ")}), <code>key</code>, <code>tempo</code>,{" "}
              <code>tags</code> (semicolon-separated in CSV, array in JSON).
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Upload className="w-4 h-4 text-primary" />
              2. Upload your file
            </div>
            <label htmlFor="song-import-file" className="sr-only">
              Choose a JSON or CSV file to import
            </label>
            <Input
              id="song-import-file"
              key={fileKey}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              aria-label="Choose a JSON or CSV file to import"
              data-testid="input-import-file"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </div>

          {parseResult && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {parseResult.songs.length > 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
                <span className="font-medium" data-testid="import-summary">
                  {parseResult.songs.length} song
                  {parseResult.songs.length === 1 ? "" : "s"} ready to import
                </span>
                <Badge
                  variant="outline"
                  className="ml-auto uppercase text-[10px]"
                >
                  {parseResult.source}
                </Badge>
              </div>
              {parseResult.songs.length > 0 && (
                <div
                  className="max-h-40 overflow-auto text-xs space-y-0.5 pl-1"
                  data-testid="import-preview-list"
                >
                  {parseResult.songs.slice(0, 50).map((s, i) => (
                    <div key={i} className="text-muted-foreground">
                      <span className="text-foreground font-medium">
                        {s.title}
                      </span>{" "}
                      — {s.author}
                      <Badge
                        variant="secondary"
                        className="ml-2 text-[9px] capitalize"
                      >
                        {s.category}
                      </Badge>
                    </div>
                  ))}
                  {parseResult.songs.length > 50 && (
                    <div className="text-muted-foreground italic">
                      …and {parseResult.songs.length - 50} more.
                    </div>
                  )}
                </div>
              )}
              {parseResult.errors.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-amber-400">
                    {parseResult.errors.length} warning
                    {parseResult.errors.length === 1 ? "" : "s"}
                  </summary>
                  <div className="mt-1 max-h-32 overflow-auto text-muted-foreground space-y-0.5 pl-1">
                    {parseResult.errors.map((e, i) => (
                      <div key={i}>{e}</div>
                    ))}
                  </div>
                </details>
              )}
              {importing && (
                <div className="text-xs text-muted-foreground">
                  Importing… {importedCount} / {parseResult.songs.length}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={importing}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                !parseResult ||
                parseResult.songs.length === 0 ||
                importing
              }
              data-testid="button-confirm-import"
            >
              {importing
                ? `Importing ${importedCount}/${parseResult?.songs.length ?? 0}…`
                : `Import${
                    parseResult && parseResult.songs.length > 0
                      ? ` ${parseResult.songs.length}`
                      : ""
                  }`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
