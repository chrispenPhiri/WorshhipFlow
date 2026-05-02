import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, RotateCcw, Send, Lightbulb, Trophy, Skull } from "lucide-react";
import { HANGMAN_WORDS, type HangmanWord } from "@/lib/games";
import { useGameBroadcast } from "@/lib/game-broadcast";

const MAX_WRONG = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Bible Hangman — classic letter-by-letter word guessing.  Six wrong
 * picks before the round is over.  Multi-word entries (e.g. "RED SEA")
 * keep the space and don't count toward letter guessing.
 */
export function HangmanGame() {
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState<HangmanWord>(() => pickWord());
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [showHint, setShowHint] = useState(false);
  const { presentOnScreen } = useGameBroadcast();

  function pickWord(): HangmanWord {
    const w = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
    return w ?? HANGMAN_WORDS[0]!;
  }

  // Letters in the target (no spaces)
  const targetLetters = useMemo(() => new Set(target.word.replace(/\s/g, "").split("")), [target]);
  const wrongPicks = useMemo(
    () => Array.from(picked).filter((l) => !targetLetters.has(l)),
    [picked, targetLetters],
  );
  const remaining = MAX_WRONG - wrongPicks.length;
  const guessedAll = Array.from(targetLetters).every((l) => picked.has(l));
  const lost = remaining <= 0 && !guessedAll;
  const finished = guessedAll || lost;

  function pickLetter(letter: string) {
    if (finished || picked.has(letter)) return;
    setPicked((p) => new Set([...p, letter]));
  }

  function newRound() {
    setTarget(pickWord());
    setPicked(new Set());
    setShowHint(false);
    setRound((r) => r + 1);
  }

  // Render the word with blanks for un-guessed letters.
  const display = useMemo(() => {
    return target.word
      .split("")
      .map((ch) => {
        if (ch === " ") return "  ";
        return picked.has(ch) || finished ? ch : "_";
      })
      .join(" ");
  }, [target, picked, finished]);

  function sendPuzzleToScreen() {
    presentOnScreen(
      "Bible Hangman",
      `${target.category}`,
      `${display}\n\nCategory: ${target.category}` +
        (wrongPicks.length > 0 ? `\nWrong: ${wrongPicks.join(" ")}` : "") +
        `\nLives: ${"♥".repeat(remaining)}${"♡".repeat(MAX_WRONG - remaining)}`,
      { fontSize: 72 },
    );
  }
  function sendAnswerToScreen() {
    presentOnScreen(
      "Bible Hangman — Answer",
      target.word,
      `${target.word}\n\n${target.category}` +
        (target.hint ? `\n${target.hint}` : ""),
      { fontSize: 80 },
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" data-testid="badge-hangman-category">{target.category}</Badge>
        <div className="flex items-center gap-1 ml-1" aria-label={`${remaining} lives remaining`} data-testid="hangman-lives">
          {Array.from({ length: MAX_WRONG }).map((_, i) => (
            <Heart
              key={i}
              className={`w-4 h-4 ${i < remaining ? "text-rose-400 fill-rose-400/40" : "text-muted-foreground/30"}`}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={newRound} className="gap-1.5" data-testid="button-hangman-new-word">
          <RotateCcw className="w-3.5 h-3.5" /> New word
        </Button>
      </div>

      {/* Word display */}
      <Card className={finished ? (guessedAll ? "border-emerald-500/40" : "border-rose-500/40") : "border-primary/30"}>
        <CardHeader className="text-center pb-2">
          <CardTitle
            className="font-mono text-3xl sm:text-4xl tracking-[0.3em] leading-snug"
            data-testid="hangman-display"
          >
            {display}
          </CardTitle>
          {target.hint && showHint && (
            <CardDescription className="italic">Hint: {target.hint}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="text-center">
          {finished && guessedAll && (
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-medium" data-testid="hangman-win">
              <Trophy className="w-4 h-4" /> You got it!
            </div>
          )}
          {finished && lost && (
            <div className="flex items-center justify-center gap-2 text-rose-400 font-medium" data-testid="hangman-lose">
              <Skull className="w-4 h-4" /> Out of lives — the word was <span className="font-semibold">{target.word}</span>.
            </div>
          )}
          {wrongPicks.length > 0 && !finished && (
            <div className="text-xs text-muted-foreground">
              Wrong: <span className="text-rose-400 font-medium">{wrongPicks.join(" ")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Letter grid */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-9 sm:grid-cols-13 gap-1.5">
            {ALPHABET.map((letter) => {
              const used = picked.has(letter);
              const correct = used && targetLetters.has(letter);
              const wrong = used && !targetLetters.has(letter);
              const colour = correct
                ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-100"
                : wrong
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-300/70"
                  : "border-border hover:border-primary/60 hover:bg-primary/5";
              return (
                <button
                  key={letter}
                  onClick={() => pickLetter(letter)}
                  disabled={used || finished}
                  className={`aspect-square rounded-md border text-sm font-semibold transition-colors disabled:cursor-default ${colour}`}
                  data-testid={`hangman-key-${letter}`}
                  aria-pressed={used}
                  aria-label={letter}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bottom controls */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {target.hint && (
          <Button size="sm" variant="ghost" onClick={() => setShowHint((s) => !s)} className="gap-1.5" data-testid="button-hangman-hint">
            <Lightbulb className="w-3.5 h-3.5" /> {showHint ? "Hide hint" : "Hint"}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={sendPuzzleToScreen} className="gap-1.5" data-testid="button-hangman-send-puzzle">
          <Send className="w-3.5 h-3.5" /> Show on screen
        </Button>
        <Button size="sm" variant="outline" onClick={sendAnswerToScreen} className="gap-1.5" data-testid="button-hangman-send-answer">
          <Send className="w-3.5 h-3.5" /> Reveal on screen
        </Button>
      </div>
    </div>
  );
}
