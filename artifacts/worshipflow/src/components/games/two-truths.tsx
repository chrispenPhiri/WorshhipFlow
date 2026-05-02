import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Trophy, Send, UserCircle2 } from "lucide-react";
import { TWO_TRUTHS, shuffle, type TwoTruthsRound } from "@/lib/games";
import { useGameBroadcast } from "@/lib/game-broadcast";

const ROUNDS = 8;

interface Answered {
  round: TwoTruthsRound;
  pickedIdx: number;
  correct: boolean;
}

/**
 * Two Truths and a Lie — three statements about a Bible figure, exactly
 * one of which is false.  Tap the lie.  After the round we explain why
 * the lie is wrong (and where the truth actually lies).
 */
export function TwoTruthsGame() {
  const { presentGameView } = useGameBroadcast();
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [picked, setPicked] = useState<number | null>(null);

  const rounds = useMemo<TwoTruthsRound[]>(
    () => shuffle(TWO_TRUTHS).slice(0, Math.min(ROUNDS, TWO_TRUTHS.length)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round],
  );

  const idx = answers.length;
  const current = rounds[idx];
  const finished = idx >= rounds.length;
  const score = answers.filter((a) => a.correct).length;
  const progressPct = (idx / Math.max(rounds.length, 1)) * 100;

  function pick(i: number) {
    if (picked !== null || !current) return;
    setPicked(i);
  }
  function next() {
    if (picked === null || !current) return;
    setAnswers((a) => [...a, { round: current, pickedIdx: picked, correct: picked === current.lieIndex }]);
    setPicked(null);
  }
  function newGame() {
    setAnswers([]);
    setPicked(null);
    setRound((r) => r + 1);
  }

  function sendStatementsToScreen() {
    if (!current) return;
    presentGameView("Two Truths and a Lie", current.subject, {
      kind: "two-truths",
      subject: current.subject,
      statements: current.statements,
      lieIndex: current.lieIndex,
      revealed: false,
      explanation: current.explanation,
      reference: current.reference,
      round: idx + 1,
      total: rounds.length,
    });
  }
  function sendAnswerToScreen() {
    if (!current) return;
    presentGameView("Two Truths and a Lie — Answer", current.subject, {
      kind: "two-truths",
      subject: current.subject,
      statements: current.statements,
      lieIndex: current.lieIndex,
      revealed: true,
      explanation: current.explanation,
      reference: current.reference,
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
              {pct === 100 ? "Truth-telling champion!" :
               pct >= 75 ? "Sharp ear for half-truths." :
               pct >= 50 ? "Solid — some of these are sneaky." :
                          "Great learning round — read the explanations below."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={newGame} className="gap-2" data-testid="button-tt-new-game">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Review</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {answers.map((a) => (
              <div key={a.round.id} className={`rounded-lg border p-3 ${a.correct ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}>
                <div className="flex items-start gap-2">
                  {a.correct
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    : <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{a.round.subject}</div>
                    <ol className="text-xs text-muted-foreground mt-1 space-y-0.5 list-[upper-alpha] pl-4">
                      {a.round.statements.map((s, i) => (
                        <li key={i} className={i === a.round.lieIndex ? "text-rose-300" : ""}>
                          {s}
                          {i === a.round.lieIndex && <span className="ml-1 italic">(lie)</span>}
                        </li>
                      ))}
                    </ol>
                    <div className="text-xs text-muted-foreground/80 mt-1 italic">{a.round.explanation}</div>
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
      {/* Top bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" data-testid="badge-tt-score">Score: {score} / {idx}</Badge>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={newGame} className="gap-1.5" data-testid="button-tt-restart">
          <RotateCcw className="w-3.5 h-3.5" /> Restart
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Round {idx + 1} of {rounds.length}</div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Subject + statements */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCircle2 className="w-5 h-5 text-primary" aria-hidden="true" />
            <CardTitle className="text-xl" data-testid="tt-subject">{current.subject}</CardTitle>
          </div>
          <CardDescription>Two of these are true; one is a lie. Tap the lie.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {current.statements.map((s, i) => {
            const isPicked = picked === i;
            const isLie = i === current.lieIndex;
            const showResult = picked !== null;
            const colour = !showResult
              ? isPicked ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 hover:bg-muted/50"
              : isLie
                ? "border-emerald-500/60 bg-emerald-500/10"   // the lie is the correct pick
                : isPicked
                  ? "border-rose-500/60 bg-rose-500/10"
                  : "border-border opacity-60";
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={showResult}
                aria-label={`Statement ${String.fromCharCode(65 + i)}: ${s}`}
                aria-pressed={isPicked}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${colour} disabled:cursor-default`}
                data-testid={`tt-statement-${i}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{s}</span>
                  {showResult && isLie && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {showResult && isPicked && !isLie && <XCircle className="w-4 h-4 text-rose-400" />}
                </div>
              </button>
            );
          })}

          {picked !== null && (
            <div className="space-y-2 pt-2">
              <div className={`text-sm rounded-md p-3 ${picked === current.lieIndex ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}`}>
                <div className="font-medium mb-0.5">
                  {picked === current.lieIndex ? "You spotted the lie!" : "Not quite — that one's actually true."}
                </div>
                <div className="text-xs opacity-90">{current.explanation}</div>
                {current.reference && (
                  <div className="text-xs opacity-70 mt-1">{current.reference}</div>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={next} className="gap-2" data-testid="button-tt-next">
                  {idx + 1 === rounds.length ? "See Results" : "Next"} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send-to-screen controls */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button size="sm" variant="outline" onClick={sendStatementsToScreen} className="gap-1.5" data-testid="button-tt-send-statements">
          <Send className="w-3.5 h-3.5" /> Show statements on screen
        </Button>
        <Button size="sm" variant="outline" onClick={sendAnswerToScreen} className="gap-1.5" data-testid="button-tt-send-answer">
          <Send className="w-3.5 h-3.5" /> Reveal lie on screen
        </Button>
      </div>
    </div>
  );
}
