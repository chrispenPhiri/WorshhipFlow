import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shuffle, Eye, RotateCcw, Send, X } from "lucide-react";
import { VERSE_SCRAMBLE, shuffle, type ScrambleVerse } from "@/lib/games";
import { useGameBroadcast } from "@/lib/game-broadcast";

/**
 * Verse Scramble — pick a verse, show the words shuffled, and have the
 * group put them back in order by tapping the words one at a time.  Wrong
 * picks are forgiving: any word can be removed from the answer row.
 */
export function VerseScrambleGame() {
  const { presentGameView } = useGameBroadcast();
  const [round, setRound] = useState(0);
  const [verse, setVerse] = useState<ScrambleVerse>(() => pickVerse());
  const [picked, setPicked] = useState<number[]>([]);     // indices into the *original* word list
  const [revealed, setRevealed] = useState(false);

  // Stable shuffled word list, refreshed when the verse changes.
  const words = useMemo(() => verse.verse.split(/\s+/), [verse]);
  const shuffledOrder = useMemo<number[]>(
    () => shuffle(words.map((_, i) => i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [verse, round],
  );

  const remaining = shuffledOrder.filter((i) => !picked.includes(i));
  const solved = picked.length === words.length && picked.every((idx, pos) => idx === pos);
  const fullText = picked.map((i) => words[i]).join(" ");
  const correctText = words.join(" ");

  function pickVerse(): ScrambleVerse {
    const v = VERSE_SCRAMBLE[Math.floor(Math.random() * VERSE_SCRAMBLE.length)];
    return v ?? VERSE_SCRAMBLE[0]!;
  }

  function nextVerse() {
    setVerse(pickVerse());
    setPicked([]);
    setRevealed(false);
    setRound((r) => r + 1);
  }

  function reset() {
    setPicked([]);
    setRevealed(false);
  }

  function pickWord(originalIdx: number) {
    if (revealed) return;
    setPicked((p) => (p.includes(originalIdx) ? p : [...p, originalIdx]));
  }

  function unpickWord(positionInPicked: number) {
    if (revealed) return;
    setPicked((p) => p.filter((_, i) => i !== positionInPicked));
  }

  // Broadcast helpers — send the structured payload so the projection
  // can render scrambled word-tiles (or the assembled verse) at scale.
  function sendScrambledToScreen() {
    presentGameView("Verse Scramble", verse.reference, {
      kind: "verse-scramble",
      words: shuffledOrder.map((i) => words[i]!),
      reference: verse.reference,
      revealed: false,
      hint: verse.hint,
    });
  }
  function sendSolutionToScreen() {
    presentGameView("Verse Scramble — Answer", verse.reference, {
      kind: "verse-scramble",
      words,
      reference: verse.reference,
      revealed: true,
    });
  }

  return (
    <div className="space-y-4">
      {/* Top control row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" data-testid="badge-scramble-reference">{verse.reference}</Badge>
        {verse.hint && (
          <span className="text-xs text-muted-foreground italic">Hint: {verse.hint}</span>
        )}
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5" data-testid="button-scramble-reset">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </Button>
        <Button size="sm" variant="outline" onClick={nextVerse} className="gap-1.5" data-testid="button-scramble-next-verse">
          <Shuffle className="w-3.5 h-3.5" /> New verse
        </Button>
      </div>

      {/* Answer area — words the group has placed so far */}
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Your sentence</CardTitle>
          <CardDescription className="text-xs">Tap a placed word to remove it.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-[64px] flex flex-wrap gap-1.5 items-start" data-testid="scramble-answer-row">
            {picked.length === 0 && (
              <span className="text-sm text-muted-foreground italic">Pick the words below to build the verse…</span>
            )}
            {picked.map((wIdx, pos) => (
              <button
                key={`${wIdx}-${pos}`}
                onClick={() => unpickWord(pos)}
                className="px-3 py-1.5 rounded-md border border-primary/40 bg-primary/10 text-sm flex items-center gap-1 hover:bg-primary/20 transition-colors"
                data-testid={`scramble-picked-${pos}`}
              >
                {words[wIdx]} <X className="w-3 h-3 opacity-60" aria-hidden="true" />
              </button>
            ))}
          </div>
          {solved && (
            <div className="mt-3 text-sm text-emerald-400 font-medium">
              Correct! That's {verse.reference}.
            </div>
          )}
          {revealed && !solved && (
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">Answer: </span>
              <span className="italic">"{correctText}"</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Word pool */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Word pool</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {remaining.length === 0 && (
              <span className="text-sm text-muted-foreground italic">All words placed.</span>
            )}
            {remaining.map((wIdx) => (
              <button
                key={wIdx}
                onClick={() => pickWord(wIdx)}
                className="px-3 py-1.5 rounded-md border border-border hover:border-primary/60 hover:bg-primary/5 text-sm transition-colors"
                data-testid={`scramble-pool-${wIdx}`}
              >
                {words[wIdx]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom buttons: send to screen + reveal */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={sendScrambledToScreen}
          className="gap-1.5"
          data-testid="button-scramble-send-puzzle"
        >
          <Send className="w-3.5 h-3.5" /> Show scramble on screen
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={sendSolutionToScreen}
          className="gap-1.5"
          data-testid="button-scramble-send-answer"
        >
          <Send className="w-3.5 h-3.5" /> Show answer on screen
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant={revealed ? "default" : "ghost"}
          onClick={() => setRevealed((r) => !r)}
          className="gap-1.5"
          data-testid="button-scramble-reveal"
        >
          <Eye className="w-3.5 h-3.5" /> {revealed ? "Hide answer" : "Reveal answer"}
        </Button>
      </div>
    </div>
  );
}
