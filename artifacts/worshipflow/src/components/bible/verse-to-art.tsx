import { getAiHeaders } from "@/lib/ai-headers";
import { useState } from "react";
import { Sparkles, Loader2, Download, X, ImageOff, Cast } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  verse: string;
  reference: string;
  book: string;
  onSetAsBackground?: (dataUrl: string) => void;
}

export function VerseToArt({ verse, reference, book, onSetAsBackground }: Props) {
  const [loading, setLoading] = useState(false);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setImageB64(null);
    try {
      const res = await fetch(`${BASE}/api/ai/verse-art`, {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({ verse, reference, book }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const { b64_json } = await res.json();
      setImageB64(b64_json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image generation failed");
    } finally {
      setLoading(false);
    }
  };

  const dataUrl = imageB64 ? `data:image/png;base64,${imageB64}` : null;

  return (
    <div className="space-y-3">
      {!imageB64 && !loading && (
        <Button
          size="sm"
          variant="outline"
          onClick={generate}
          disabled={loading}
          className="gap-2 w-full border-primary/30 text-primary hover:bg-primary/10"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generate Verse Art (AI)
        </Button>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-center">
            Painting your verse…<br />
            <span className="text-[10px]">This takes ~15 seconds</span>
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-3">
          <ImageOff className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {dataUrl && (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden border border-border aspect-square">
            <img src={dataUrl} alt={`Verse art for ${reference}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
              <p className="text-white text-xs font-serif italic leading-snug line-clamp-2">"{verse.slice(0, 120)}{verse.length > 120 ? "…" : ""}"</p>
            </div>
            <button
              type="button"
              onClick={() => { setImageB64(null); setError(null); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-2">
            <a href={dataUrl} download={`verse-art-${reference.replace(/[^a-z0-9]/gi, "-")}.png`} className="flex-1">
              <Button size="sm" variant="outline" className="w-full gap-2 text-xs h-8">
                <Download className="w-3.5 h-3.5" /> Download
              </Button>
            </a>
            {onSetAsBackground && (
              <Button size="sm" className="flex-1 gap-2 text-xs h-8" onClick={() => onSetAsBackground(dataUrl)}>
                <Cast className="w-3.5 h-3.5" /> Set as Background
              </Button>
            )}
            <Button size="sm" variant="ghost" className="gap-2 text-xs h-8" onClick={generate}>
              <Sparkles className="w-3 h-3" /> Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
