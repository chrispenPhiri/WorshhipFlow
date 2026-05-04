import { useState, useRef, useEffect, useCallback } from "react";
import { Music, Volume2, VolumeX, Play, Square, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type SoundType = "wind" | "rain" | "ocean" | "forest" | "fire" | "chants";

const SOUNDSCAPES: { id: SoundType; label: string; emoji: string; desc: string }[] = [
  { id: "wind",   label: "Desert Wind",     emoji: "🌵", desc: "Exodus, Isaiah, Job" },
  { id: "rain",   label: "Gentle Rain",     emoji: "🌧️", desc: "Jeremiah, James" },
  { id: "ocean",  label: "Ocean Waves",     emoji: "🌊", desc: "Jonah, 1 Peter, Mark" },
  { id: "forest", label: "Forest Breeze",   emoji: "🌿", desc: "Genesis, Ruth, Luke" },
  { id: "fire",   label: "Crackling Fire",  emoji: "🔥", desc: "Acts, Revelation, Joel" },
  { id: "chants", label: "Temple Chants",   emoji: "🏛️", desc: "Psalms, Leviticus, Hebrews" },
];

const BOOK_SUGGEST: Record<string, SoundType> = {
  Genesis: "forest", Exodus: "wind", Leviticus: "chants", Numbers: "wind",
  Deuteronomy: "wind", Joshua: "wind", Judges: "fire", Ruth: "forest",
  "1 Samuel": "fire", "2 Samuel": "fire", "1 Kings": "fire", "2 Kings": "fire",
  "1 Chronicles": "chants", "2 Chronicles": "chants", Ezra: "chants",
  Nehemiah: "chants", Esther: "chants", Job: "wind", Psalms: "chants",
  Proverbs: "forest", Ecclesiastes: "forest", "Song of Solomon": "forest",
  Isaiah: "wind", Jeremiah: "rain", Lamentations: "rain", Ezekiel: "wind",
  Daniel: "chants", Hosea: "rain", Joel: "fire", Amos: "wind",
  Obadiah: "wind", Jonah: "ocean", Micah: "wind", Nahum: "fire",
  Habakkuk: "wind", Zephaniah: "fire", Haggai: "chants", Zechariah: "chants",
  Malachi: "chants", Matthew: "chants", Mark: "ocean", Luke: "forest",
  John: "chants", Acts: "fire", Romans: "chants", "1 Corinthians": "chants",
  "2 Corinthians": "chants", Galatians: "wind", Ephesians: "chants",
  Philippians: "chants", Colossians: "chants", "1 Thessalonians": "fire",
  "2 Thessalonians": "fire", "1 Timothy": "chants", "2 Timothy": "chants",
  Titus: "chants", Philemon: "forest", Hebrews: "chants", James: "rain",
  "1 Peter": "ocean", "2 Peter": "ocean", "1 John": "forest",
  "2 John": "forest", "3 John": "forest", Jude: "fire", Revelation: "fire",
};

function buildGraph(ctx: AudioContext, type: SoundType, volume: number): () => void {
  const gain = ctx.createGain();
  gain.gain.value = volume * 0.6;
  gain.connect(ctx.destination);

  const bufSize = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);

  if (type === "fire") {
    // Brown noise for crackling fire
    let last = 0;
    for (let i = 0; i < bufSize; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 4;
    }
  } else {
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();

  switch (type) {
    case "wind": {
      filter.type = "bandpass"; filter.frequency.value = 350; filter.Q.value = 0.4;
      const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
      lfo.frequency.value = 0.08; lfoG.gain.value = 0.18;
      lfo.connect(lfoG); lfoG.connect(gain.gain); lfo.start();
      noise.connect(filter); filter.connect(gain);
      noise.start();
      return () => { try { noise.stop(); lfo.stop(); } catch {} };
    }
    case "rain": {
      filter.type = "highpass"; filter.frequency.value = 1200; filter.Q.value = 0.5;
      const lfo2 = ctx.createOscillator(); const lfoG2 = ctx.createGain();
      lfo2.frequency.value = 3; lfoG2.gain.value = 0.05;
      lfo2.connect(lfoG2); lfoG2.connect(gain.gain); lfo2.start();
      noise.connect(filter); filter.connect(gain);
      noise.start();
      return () => { try { noise.stop(); lfo2.stop(); } catch {} };
    }
    case "ocean": {
      filter.type = "lowpass"; filter.frequency.value = 600; filter.Q.value = 1;
      const lfo3 = ctx.createOscillator(); const lfoG3 = ctx.createGain();
      lfo3.frequency.value = 0.12; lfoG3.gain.value = 0.4;
      lfo3.connect(lfoG3); lfoG3.connect(gain.gain); lfo3.start();
      noise.connect(filter); filter.connect(gain);
      noise.start();
      return () => { try { noise.stop(); lfo3.stop(); } catch {} };
    }
    case "forest": {
      filter.type = "bandpass"; filter.frequency.value = 800; filter.Q.value = 0.8;
      const lfo4 = ctx.createOscillator(); const lfoG4 = ctx.createGain();
      lfo4.frequency.value = 0.4; lfoG4.gain.value = 0.08;
      lfo4.connect(lfoG4); lfoG4.connect(gain.gain); lfo4.start();
      noise.connect(filter); filter.connect(gain);
      noise.start();
      return () => { try { noise.stop(); lfo4.stop(); } catch {} };
    }
    case "fire": {
      filter.type = "lowpass"; filter.frequency.value = 900; filter.Q.value = 0.3;
      const lfo5 = ctx.createOscillator(); const lfoG5 = ctx.createGain();
      lfo5.frequency.value = 6; lfoG5.gain.value = 0.06;
      lfo5.connect(lfoG5); lfoG5.connect(gain.gain); lfo5.start();
      noise.connect(filter); filter.connect(gain);
      noise.start();
      return () => { try { noise.stop(); lfo5.stop(); } catch {} };
    }
    case "chants": {
      // Layered filtered tones simulating distant chanting
      filter.type = "bandpass"; filter.frequency.value = 220; filter.Q.value = 8;
      noise.connect(filter); filter.connect(gain);
      const f2 = ctx.createBiquadFilter(); f2.type = "bandpass"; f2.frequency.value = 440; f2.Q.value = 10;
      const g2 = ctx.createGain(); g2.gain.value = volume * 0.3;
      noise.connect(f2); f2.connect(g2); g2.connect(ctx.destination);
      noise.start();
      return () => { try { noise.stop(); } catch {} };
    }
    default:
      noise.connect(gain); noise.start();
      return () => { try { noise.stop(); } catch {} };
  }
}

interface Props { book: string; }

export function AmbientSoundscapes({ book }: Props) {
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState<SoundType | null>(null);
  const [volume, setVolume] = useState(0.4);
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const suggested = BOOK_SUGGEST[book] ?? "chants";

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setPlaying(null);
  }, []);

  const play = useCallback((type: SoundType) => {
    stop();
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const cleanup = buildGraph(ctx, type, muted ? 0 : volume);
    stopRef.current = cleanup;
    setPlaying(type);
  }, [stop, volume, muted]);

  useEffect(() => stop, [stop]);

  const toggleMute = () => {
    setMuted(m => !m);
    if (playing && ctxRef.current) {
      const masterGain = ctxRef.current.destination;
      // Re-trigger to apply new volume
      const current = playing;
      stop();
      setTimeout(() => play(current), 50);
    }
  };

  const meta = SOUNDSCAPES.find(s => s.id === playing);
  const suggestedMeta = SOUNDSCAPES.find(s => s.id === suggested);

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <Music className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium">Ambient Soundscapes</span>
          {playing && (
            <Badge className="text-[10px] py-0 h-4 bg-green-600/20 text-green-400 border-green-600/30 gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              {meta?.emoji} {meta?.label}
            </Badge>
          )}
          {!playing && (
            <span className="text-xs text-muted-foreground">Suggested: {suggestedMeta?.emoji} {suggestedMeta?.label}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border/60 p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SOUNDSCAPES.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => playing === s.id ? stop() : play(s.id)}
                className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                  playing === s.id
                    ? "bg-primary/20 border-primary text-primary"
                    : s.id === suggested
                      ? "border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10"
                      : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 w-full">
                  <span className="text-base">{s.emoji}</span>
                  <span className="text-xs font-medium flex-1">{s.label}</span>
                  {playing === s.id && <Square className="w-3 h-3 shrink-0" />}
                  {playing !== s.id && s.id === suggested && <Badge className="text-[9px] py-0 h-3.5 bg-primary/20 text-primary border-primary/30">✦ auto</Badge>}
                </div>
                <span className="text-[10px] text-muted-foreground ml-6">{s.desc}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={toggleMute} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
              onChange={e => { setVolume(+e.target.value); if (muted) setMuted(false); }}
              className="flex-1 accent-primary h-1.5 cursor-pointer"
            />
            <span className="text-xs text-muted-foreground w-8 text-right">{Math.round((muted ? 0 : volume) * 100)}%</span>
            {playing && (
              <button type="button" onClick={stop}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                <Square className="w-3 h-3" /> Stop
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Sounds are generated in-browser via Web Audio — no downloads required. Soundscape auto-suggested based on the current book.
          </p>
        </div>
      )}
    </div>
  );
}
