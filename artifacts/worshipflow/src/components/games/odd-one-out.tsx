import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Trophy, Send } from "lucide-react";
import { ODD_ONE_OUT, shuffle, type OddOneOutRound, type TriviaDifficulty } from "@/lib/games";
import { useGameBroadcast } from "@/lib/game-broadcast";
import type { OddOneOutStagePayload } from "@/lib/game-stage-payload";

const ROUNDS = 8;
const DIFFICULTIES: (TriviaDifficulty | "Mixed")[] = ["Mixed", "Easy", "Medium", "Hard"];

interface Display {
  /** The original round (with the canonical oddIndex). */
  round: OddOneOutRound;
  /** Items in the displayed order (shuffled). */
  items: string[];
  /** Index in `items` of the canonical odd item. */
  oddDisplayIndex: number;
}

interface Answered {
  d: Display;
  pickedIndex: number;
  correct: boolean;
}

function makeDisplay(round: OddOneOutRound): Display {
  // Pair each item with its original index, shuffle, then locate the odd.
  const paired = round.items.map((text, i) => ({ text, i }));
  const shuffled = shuffle(paired);
  return {
    round,
    items: shuffled.map(p => p.text),
    oddDisplayIndex: shuffled.findIndex(p => p.i === round.oddIndex),
  };
}

export function OddOneOutGame() {
  const [difficulty, setDifficulty] = useState<TriviaDifficulty | "Mixed">("Mixed");
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const { presentGameView } = useGameBroadcast();

  const rounds = useMemo<Display[]>(() => {
    const pool = difficulty === "Mixed"
      ? ODD_ONE_OUT
      : ODD_ONE_OUT.filter(r => r.difficulty === difficulty);
    return shuffle(pool).slice(0, Math.min(ROUNDS, pool.length)).map(makeDisplay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, round]);

  const idx = answers.length;
  const current = rounds[idx];
  const finished = idx >= rounds.length;
  const score = answers.filter(a => a.correct).length;
  const progressPct = (idx / Math.max(rounds.length, 1)) * 100;

  function pick(displayIndex: number) {
    if (picked !== null || !current) return;
    setPicked(displayIndex);
  }

  function next() {
    if (picked === null || !current) return;
    setAnswers(a => [...a, { d: current, pickedIndex: picked, correct: picked === current.oddDisplayIndex }]);
    setPicked(null);
  }

  function newGame() {
    setAnswers([]);
    setPicked(null);
    setRound(r => r + 1);
  }

  function changeDifficulty(d: TriviaDifficulty | "Mixed") {
    setDifficulty(d);
    setAnswers([]);
    setPicked(null);
    setRound(r => r + 1);
  }

  function sendQuestionToScreen() {
    if (!current) return;
    const payload: OddOneOutStagePayload = {
      kind: "odd-one-out",
      category: current.round.category,
      items: current.items,
      oddIndex: current.oddDisplayIndex,
      revealed: false,
    };
    presentGameView("Odd One Out", current.round.category, payload);
  }
  function sendAnswerToScreen() {
    if (!current) return;
    const payload: OddOneOutStagePayload = {
      kind: "odd-one-out",
      category: current.round.category,
      items: current.items,
      oddIndex: current.oddDisplayIndex,
      revealed: true,
      connection: current.round.connection,
      explanation: current.round.explanation,
    };
    presentGameView("Odd One Out — Answer", current.round.category, payload);
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
            <CardTitle className="text-3xl mt-2" data-testid="text-ooo-final-score">
              {score} / {rounds.length}
            </CardTitle>
            <CardDescription>
              {pct === 100 ? "A perfect ear for what doesn't fit." :
               pct >= 75 ? "Sharp eye." :
               pct >= 50 ? "A respectable round — review below." :
                          "Read the connections below — you'll spot more next time."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={newGame} className="gap-2" data-testid="button-ooo-new-game">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Review</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {answers.map(a => {
              const odd = a.d.items[a.d.oddDisplayIndex]!;
              return (
                <div key={a.d.round.id} className={`rounded-lg border p-3 ${a.correct ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}>
                  <div className="flex items-start gap-2">
                    {a.correct
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      : <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Items:</span> {a.d.items.join(" · ")}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Odd one: <span className="text-foreground font-medium">{odd}</span>
                        {!a.correct && <> — you picked: <span className="text-foreground">{a.d.items[a.pickedIndex]}</span></>}
                      </div>
                      <div className="text-xs text-muted-foreground/90 mt-1 italic">
                        The other three: {a.d.round.connection} {a.d.round.explanation}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!current) return null;

  const correctIndex = current.oddDisplayIndex;

  return (
    <div className="space-y-4">
      {/* Difficulty + score row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Difficulty:</span>
        {DIFFICULTIES.map(d => (
          <Button
            key={d}
            size="sm"
            variant={difficulty === d ? "default" : "outline"}
            onClick={() => changeDifficulty(d)}
            data-testid={`button-ooo-difficulty-${d.toLowerCase()}`}
          >
            {d}
          </Button>
        ))}
        <div className="flex-1" />
        <Badge variant="outline" data-testid="badge-ooo-score">Score: {score} / {idx}</Badge>
        <Button size="sm" variant="ghost" onClick={newGame} className="gap-1.5" data-testid="button-ooo-restart">
          <RotateCcw className="w-3.5 h-3.5" /> Restart
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Round {idx + 1} of {rounds.length}</div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Round card */}
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit mb-2" data-testid="badge-ooo-category">{current.round.category}</Badge>
          <CardTitle className="text-xl leading-snug">Which one doesn't belong?</CardTitle>
          <CardDescription>Three of these share a Bible connection. Tap the odd one out.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {current.items.map((item, i) => {
              const isPicked = picked === i;
              const isCorrect = i === correctIndex;
              const showResult = picked !== null;
              const colour = !showResult
                ? "border-border hover:border-primary/40 hover:bg-muted/50"
                : isCorrect
                  ? "border-emerald-500/60 bg-emerald-500/10"
                  : isPicked
                    ? "border-rose-500/60 bg-rose-500/10"
                    : "border-border opacity-60";
              return (
                <button
                  key={`${item}-${i}`}
                  onClick={() => pick(i)}
                  disabled={showResult}
                  className={`p-4 rounded-lg border text-base font-medium transition-colors ${colour} disabled:cursor-default`}
                  data-testid={`button-ooo-item-${i}`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className="space-y-2">
              <div className={`text-sm rounded-md p-3 ${picked === correctIndex ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}`}>
                <div className="font-medium mb-0.5">
                  {picked === correctIndex
                    ? "Correct!"
                    : `Not quite — the odd one was “${current.items[correctIndex]}”.`}
                </div>
                <div className="text-xs opacity-90">
                  The other three: {current.round.connection} {current.round.explanation}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={next} className="gap-2" data-testid="button-ooo-next">
                  {idx + 1 === rounds.length ? "See Results" : "Next"} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send to screen */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button size="sm" variant="outline" onClick={sendQuestionToScreen} className="gap-1.5" data-testid="button-ooo-send-question">
          <Send className="w-3.5 h-3.5" /> Show on screen
        </Button>
        <Button size="sm" variant="outline" onClick={sendAnswerToScreen} className="gap-1.5" data-testid="button-ooo-send-answer">
          <Send className="w-3.5 h-3.5" /> Reveal answer on screen
        </Button>
      </div>
    </div>
  );
}
