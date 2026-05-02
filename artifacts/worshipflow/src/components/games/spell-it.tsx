import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, RotateCcw, Send, Shuffle, X, CheckCircle2 } from "lucide-react";
import { SPELL_WORDS, shuffle, type SpellWord } from "@/lib/games";
import { useGameBroadcast } from "@/lib/game-broadcast";

/**
 * Bible Spell-It — show a clue, then a pool of letters (the answer's
 * letters plus a few decoys).  Tap letters in order to spell the word.
 * The picked row reveals correctness once the right number of letters is
 * in place.  Players can untap any picked letter to backtrack.
 */
export function SpellItGame() {
  const { presentOnScreen } = useGameBroadcast();
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState<SpellWord>(() => pickWord());
  const [picked, setPicked] = useState<number[]>([]);   // indices into the pool
  const [revealed, setRevealed] = useState(false);

  /** Build the letter pool: word letters + decoys, then shuffled. */
  const pool = useMemo<string[]>(() => {
    const letters = target.word.split("").concat(target.decoys);
    return shuffle(letters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, round]);

  const remaining = pool.map((_, i) => i).filter((i) => !picked.includes(i));
  const built = picked.map((i) => pool[i]).join("");
  const filledToWordLength = picked.length === target.word.length;
  const correct = filledToWordLength && built === target.word;
  const wrong = filledToWordLength && !correct;

  function pickWord(): SpellWord {
    const w = SPELL_WORDS[Math.floor(Math.random() * SPELL_WORDS.length)];
    return w ?? SPELL_WORDS[0]!;
  }

  function nextWord() {
    setTarget(pickWord());
    setPicked([]);
    setRevealed(false);
    setRound((r) => r + 1);
  }

  function reset() {
    setPicked([]);
    setRevealed(false);
  }

  function pickLetter(poolIdx: number) {
    if (revealed || correct) return;
    if (picked.length >= target.word.length) return;
    setPicked((p) => [...p, poolIdx]);
  }

  function unpickLetter(positionInPicked: number) {
    if (revealed || correct) return;
    setPicked((p) => p.filter((_, i) => i !== positionInPicked));
  }

  function sendClueToScreen() {
    presentOnScreen(
      "Bible Spell-It",
      target.word,
      `${target.clue}\n\nLetters: ${target.word.length}\nCategory: ${target.category}`,
      { fontSize: 56 },
    );
  }
  function sendAnswerToScreen() {
    presentOnScreen(
      "Bible Spell-It — Answer",
      target.word,
      `${target.clue}\n\n${target.word}`,
      { fontSize: 80 },
    );
  }

  // Each blank slot in the answer row.  When the picked row is fully
  // filled we colour-code by correctness so the player gets feedback
  // without having to press a check button.
  function slotColour(): string {
    if (correct) return "border-emerald-500/60 bg-emerald-500/15 text-emerald-100";
    if (wrong) return "border-rose-500/50 bg-rose-500/10 text-rose-200";
    return "border-primary/40 bg-primary/5";
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" data-testid="badge-spell-category">{target.category}</Badge>
        <Badge variant="outline" className="text-[10px]">{target.word.length} letters</Badge>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5" data-testid="button-spell-reset">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </Button>
        <Button size="sm" variant="outline" onClick={nextWord} className="gap-1.5" data-testid="button-spell-next-word">
          <Shuffle className="w-3.5 h-3.5" /> New word
        </Button>
      </div>

      {/* Clue */}
      <Card>
        <CardHeader className="pb-3">
          <CardDescription className="text-xs uppercase tracking-wider">Clue</CardDescription>
          <CardTitle className="text-lg leading-snug" data-testid="spell-clue">{target.clue}</CardTitle>
        </CardHeader>
      </Card>

      {/* Answer slots */}
      <Card className={correct ? "border-emerald-500/40" : wrong ? "border-rose-500/40" : "border-primary/30"}>
        <CardContent className="p-4">
          <div className="flex flex-wrap justify-center gap-1.5" data-testid="spell-slots">
            {Array.from({ length: target.word.length }).map((_, i) => {
              const ch = picked[i] !== undefined ? pool[picked[i]!] : "";
              const filled = ch !== "";
              return (
                <button
                  key={i}
                  onClick={() => filled && unpickLetter(i)}
                  disabled={!filled || revealed}
                  className={`w-10 h-12 sm:w-11 sm:h-14 rounded-md border-2 font-mono text-xl font-bold flex items-center justify-center transition-colors disabled:cursor-default ${
                    filled ? slotColour() : "border-border bg-muted/30 text-muted-foreground"
                  }`}
                  data-testid={`spell-slot-${i}`}
                  aria-label={filled ? `Slot ${i + 1}: ${ch}` : `Slot ${i + 1}: empty`}
                >
                  {revealed && !filled ? target.word[i] : (filled ? ch : "_")}
                </button>
              );
            })}
          </div>
          {correct && (
            <div className="mt-3 text-center text-sm text-emerald-400 font-medium flex items-center justify-center gap-1.5" data-testid="spell-correct">
              <CheckCircle2 className="w-4 h-4" /> Correct!
            </div>
          )}
          {wrong && (
            <div className="mt-3 text-center text-sm text-rose-300">
              Not quite — tap a letter above to remove it and try again.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Letter pool */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Letter pool</CardTitle>
          <CardDescription className="text-xs">Tap letters in order to spell the word.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-1.5">
            {remaining.length === 0 && (
              <span className="text-sm text-muted-foreground italic">All letters used.</span>
            )}
            {remaining.map((poolIdx) => (
              <button
                key={poolIdx}
                onClick={() => pickLetter(poolIdx)}
                disabled={revealed || correct || picked.length >= target.word.length}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-md border border-border bg-muted/40 hover:border-primary/60 hover:bg-primary/5 font-mono text-lg font-semibold transition-colors disabled:cursor-default disabled:opacity-50"
                data-testid={`spell-pool-${poolIdx}`}
              >
                {pool[poolIdx]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom controls */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button size="sm" variant="outline" onClick={sendClueToScreen} className="gap-1.5" data-testid="button-spell-send-clue">
          <Send className="w-3.5 h-3.5" /> Show clue on screen
        </Button>
        <Button size="sm" variant="outline" onClick={sendAnswerToScreen} className="gap-1.5" data-testid="button-spell-send-answer">
          <Send className="w-3.5 h-3.5" /> Reveal answer on screen
        </Button>
        <div className="flex-1" />
        {!correct && (
          <Button
            size="sm"
            variant={revealed ? "default" : "ghost"}
            onClick={() => {
              setRevealed((r) => !r);
              if (!revealed) setPicked([]); // clear picks when revealing so we draw from the actual word
            }}
            className="gap-1.5"
            data-testid="button-spell-reveal"
          >
            <Eye className="w-3.5 h-3.5" /> {revealed ? "Hide answer" : "Reveal answer"}
          </Button>
        )}
        {(revealed || correct) && (
          <Button size="sm" variant="ghost" onClick={() => { setRevealed(false); setPicked([]); reset(); }} data-testid="button-spell-clear-reveal">
            <X className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
