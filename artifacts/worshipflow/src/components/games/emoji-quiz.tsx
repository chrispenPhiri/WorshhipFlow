import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Trophy, Send, Lightbulb } from "lucide-react";
import { EMOJI_QUIZ, shuffle, type EmojiPuzzle } from "@/lib/games";
import { useGameBroadcast } from "@/lib/game-broadcast";

const ROUNDS = 8;

interface Answered {
  puzzle: EmojiPuzzle;
  picked: string;
  correct: boolean;
}

export function EmojiQuizGame() {
  const { presentGameView } = useGameBroadcast();
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const rounds = useMemo<EmojiPuzzle[]>(
    () => shuffle(EMOJI_QUIZ).slice(0, ROUNDS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round],
  );
  // For each round, randomise the option order so the answer isn't always
  // in the same position.
  const optionsByRound = useMemo<string[][]>(
    () => rounds.map((r) => shuffle(r.options)),
    [rounds],
  );

  const idx = answers.length;
  const current = rounds[idx];
  const currentOptions = optionsByRound[idx] ?? [];
  const finished = idx >= rounds.length;
  const score = answers.filter((a) => a.correct).length;
  const progressPct = (idx / rounds.length) * 100;

  function pick(opt: string) {
    if (picked !== null || !current) return;
    setPicked(opt);
  }

  function next() {
    if (picked === null || !current) return;
    setAnswers((a) => [...a, { puzzle: current, picked, correct: picked === current.answer }]);
    setPicked(null);
    setShowHint(false);
  }

  function newGame() {
    setAnswers([]);
    setPicked(null);
    setShowHint(false);
    setRound((r) => r + 1);
  }

  function sendPuzzleToScreen() {
    if (!current) return;
    const correctIdx = currentOptions.indexOf(current.answer);
    presentGameView("Bible Emoji Quiz", `Puzzle ${idx + 1}`, {
      kind: "emoji-quiz",
      emojis: current.emojis,
      category: current.category,
      options: currentOptions,
      correctIndex: correctIdx,
      revealed: false,
      hint: current.hint,
      round: idx + 1,
      total: rounds.length,
    });
  }

  function sendAnswerToScreen() {
    if (!current) return;
    const correctIdx = currentOptions.indexOf(current.answer);
    presentGameView("Bible Emoji Quiz — Answer", current.answer, {
      kind: "emoji-quiz",
      emojis: current.emojis,
      category: current.category,
      options: currentOptions,
      correctIndex: correctIdx,
      revealed: true,
      round: idx + 1,
      total: rounds.length,
    });
  }

  if (finished) {
    const pct = Math.round((score / rounds.length) * 100);
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-primary/20 text-primary rounded-full w-fit">
              <Trophy className="w-8 h-8" />
            </div>
            <CardTitle className="text-3xl mt-2">{score} / {rounds.length}</CardTitle>
            <CardDescription>
              {pct === 100 ? "Emoji master! You read between the icons." :
               pct >= 75 ? "Great eye for visual storytelling." :
               pct >= 50 ? "Nice work — some of these are tricky." :
                          "Keep playing — each round teaches a new clue."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={newGame} className="gap-2" data-testid="button-emoji-new-game">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Review</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {answers.map((a, i) => (
              <div key={a.puzzle.id} className={`rounded-lg border p-3 ${a.correct ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}>
                <div className="flex items-start gap-3">
                  <div className="text-3xl shrink-0" aria-hidden="true">{a.puzzle.emojis}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{a.puzzle.answer}</div>
                    {!a.correct && (
                      <div className="text-xs text-muted-foreground mt-0.5">You said: {a.picked}</div>
                    )}
                  </div>
                  {a.correct
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-rose-400 mt-0.5" />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" data-testid="badge-emoji-score">Score: {score} / {idx}</Badge>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={newGame} className="gap-1.5" data-testid="button-emoji-restart">
          <RotateCcw className="w-3.5 h-3.5" /> Restart
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Puzzle {idx + 1} of {rounds.length}</span>
          <Badge variant="outline" className="text-[10px] py-0">{current.category}</Badge>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Puzzle card */}
      <Card>
        <CardHeader className="text-center">
          <div className="text-6xl sm:text-7xl py-4" data-testid="emoji-puzzle">
            {current.emojis}
          </div>
          <CardDescription>What Bible {current.category.toLowerCase()} is this?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {currentOptions.map((opt, i) => {
            const isPicked = picked === opt;
            const isCorrect = opt === current.answer;
            const showResult = picked !== null;
            const colour = !showResult
              ? isPicked ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 hover:bg-muted/50"
              : isCorrect
                ? "border-emerald-500/60 bg-emerald-500/10"
                : isPicked
                  ? "border-rose-500/60 bg-rose-500/10"
                  : "border-border opacity-60";
            return (
              <button
                key={opt}
                onClick={() => pick(opt)}
                disabled={showResult}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${colour} disabled:cursor-default`}
                data-testid={`emoji-option-${i}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {showResult && isPicked && !isCorrect && <XCircle className="w-4 h-4 text-rose-400" />}
                </div>
              </button>
            );
          })}

          {picked !== null && (
            <div className="flex items-center justify-end gap-2 pt-3">
              <Button onClick={next} className="gap-2" data-testid="button-emoji-next">
                {idx + 1 === rounds.length ? "See Results" : "Next"} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-puzzle controls: hint + send to screen */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {current.hint && (
          <Button size="sm" variant="ghost" onClick={() => setShowHint((s) => !s)} className="gap-1.5" data-testid="button-emoji-hint">
            <Lightbulb className="w-3.5 h-3.5" /> {showHint ? "Hide hint" : "Hint"}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={sendPuzzleToScreen} className="gap-1.5" data-testid="button-emoji-send-puzzle">
          <Send className="w-3.5 h-3.5" /> Show on screen
        </Button>
        <Button size="sm" variant="outline" onClick={sendAnswerToScreen} className="gap-1.5" data-testid="button-emoji-send-answer">
          <Send className="w-3.5 h-3.5" /> Reveal on screen
        </Button>
      </div>
      {showHint && current.hint && (
        <div className="text-center text-sm text-muted-foreground italic">Hint: {current.hint}</div>
      )}
    </div>
  );
}
