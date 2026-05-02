import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Trophy, Send, Check, X } from "lucide-react";
import { TRUE_OR_FALSE, shuffle, type TrueFalseStatement, type TriviaDifficulty } from "@/lib/games";
import { useGameBroadcast } from "@/lib/game-broadcast";

const ROUNDS = 10;
const DIFFICULTIES: (TriviaDifficulty | "Mixed")[] = ["Mixed", "Easy", "Medium", "Hard"];

interface Answered {
  s: TrueFalseStatement;
  picked: boolean;
  correct: boolean;
}

export function TrueOrFalseGame() {
  const [difficulty, setDifficulty] = useState<TriviaDifficulty | "Mixed">("Mixed");
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [picked, setPicked] = useState<boolean | null>(null);
  const { presentGameView } = useGameBroadcast();

  const statements = useMemo<TrueFalseStatement[]>(() => {
    const pool = difficulty === "Mixed"
      ? TRUE_OR_FALSE
      : TRUE_OR_FALSE.filter((q) => q.difficulty === difficulty);
    return shuffle(pool).slice(0, Math.min(ROUNDS, pool.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, round]);

  const idx = answers.length;
  const current = statements[idx];
  const finished = idx >= statements.length;
  const score = answers.filter((a) => a.correct).length;
  const progressPct = (idx / Math.max(statements.length, 1)) * 100;

  function pick(value: boolean) {
    if (picked !== null || !current) return;
    setPicked(value);
  }

  function next() {
    if (picked === null || !current) return;
    setAnswers((a) => [...a, { s: current, picked, correct: picked === current.answer }]);
    setPicked(null);
  }

  function newGame() {
    setAnswers([]);
    setPicked(null);
    setRound((r) => r + 1);
  }

  function changeDifficulty(d: TriviaDifficulty | "Mixed") {
    setDifficulty(d);
    setAnswers([]);
    setPicked(null);
    setRound((r) => r + 1);
  }

  function sendStatementToScreen() {
    if (!current) return;
    presentGameView("True or False?", `Round ${idx + 1}`, {
      kind: "true-false",
      statement: current.statement,
      answer: current.answer,
      revealed: false,
      explanation: current.explanation,
      reference: current.reference,
      round: idx + 1,
      total: statements.length,
    });
  }
  function sendAnswerToScreen() {
    if (!current) return;
    presentGameView("True or False — Answer", `Round ${idx + 1}`, {
      kind: "true-false",
      statement: current.statement,
      answer: current.answer,
      revealed: true,
      explanation: current.explanation,
      reference: current.reference,
      round: idx + 1,
      total: statements.length,
    });
  }

  if (finished) {
    const pct = Math.round((score / statements.length) * 100);
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-primary/20 text-primary rounded-full w-fit">
              <Trophy className="w-8 h-8" />
            </div>
            <CardTitle className="text-3xl mt-2">{score} / {statements.length}</CardTitle>
            <CardDescription>
              {pct === 100 ? "Perfect — you can spot a tall tale a mile off." :
               pct >= 75 ? "Excellent recall." :
               pct >= 50 ? "Solid effort — try the Hard pool next." :
                          "A great learning round — read the explanations below."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={newGame} className="gap-2" data-testid="button-tf-new-game">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Review</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {answers.map((a) => (
              <div key={a.s.id} className={`rounded-lg border p-3 ${a.correct ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}>
                <div className="flex items-start gap-2">
                  {a.correct
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    : <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{a.s.statement}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Answer: <span className="text-foreground font-medium">{a.s.answer ? "TRUE" : "FALSE"}</span>
                      {a.picked !== a.s.answer && <> — you picked: <span className="text-foreground">{a.picked ? "TRUE" : "FALSE"}</span></>}
                      {a.s.reference && <> · {a.s.reference}</>}
                    </div>
                    <div className="text-xs text-muted-foreground/80 mt-1 italic">{a.s.explanation}</div>
                  </div>
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
      {/* Difficulty + score row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Difficulty:</span>
        {DIFFICULTIES.map((d) => (
          <Button
            key={d}
            size="sm"
            variant={difficulty === d ? "default" : "outline"}
            onClick={() => changeDifficulty(d)}
            data-testid={`button-tf-difficulty-${d.toLowerCase()}`}
          >
            {d}
          </Button>
        ))}
        <div className="flex-1" />
        <Badge variant="outline" data-testid="badge-tf-score">Score: {score} / {idx}</Badge>
        <Button size="sm" variant="ghost" onClick={newGame} className="gap-1.5" data-testid="button-tf-restart">
          <RotateCcw className="w-3.5 h-3.5" /> Restart
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Statement {idx + 1} of {statements.length}</div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Statement card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl leading-snug" data-testid="tf-statement">
            {current.statement}
          </CardTitle>
          <CardDescription>True or false?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map((value) => {
              const isPicked = picked === value;
              const isCorrect = value === current.answer;
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
                  key={String(value)}
                  onClick={() => pick(value)}
                  disabled={showResult}
                  aria-label={value ? "True" : "False"}
                  aria-pressed={isPicked}
                  className={`p-6 rounded-lg border text-lg font-semibold transition-colors ${colour} disabled:cursor-default`}
                  data-testid={`button-tf-${value ? "true" : "false"}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {value
                      ? <Check className="w-6 h-6 text-emerald-400" />
                      : <X className="w-6 h-6 text-rose-400" />}
                    {value ? "TRUE" : "FALSE"}
                  </div>
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className="space-y-2">
              <div className={`text-sm rounded-md p-3 ${picked === current.answer ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}`}>
                <div className="font-medium mb-0.5">
                  {picked === current.answer ? "Correct!" : `Not quite — the answer was ${current.answer ? "TRUE" : "FALSE"}.`}
                </div>
                <div className="text-xs opacity-90">{current.explanation}</div>
                {current.reference && (
                  <div className="text-xs opacity-70 mt-1">{current.reference}</div>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={next} className="gap-2" data-testid="button-tf-next">
                  {idx + 1 === statements.length ? "See Results" : "Next"} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send-to-screen controls */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button size="sm" variant="outline" onClick={sendStatementToScreen} className="gap-1.5" data-testid="button-tf-send-statement">
          <Send className="w-3.5 h-3.5" /> Show statement on screen
        </Button>
        <Button size="sm" variant="outline" onClick={sendAnswerToScreen} className="gap-1.5" data-testid="button-tf-send-answer">
          <Send className="w-3.5 h-3.5" /> Reveal answer on screen
        </Button>
      </div>
    </div>
  );
}
