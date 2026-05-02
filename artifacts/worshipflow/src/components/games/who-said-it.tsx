import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Trophy, Quote, Send } from "lucide-react";
import { WHO_SAID_IT, shuffle, type QuoteRound } from "@/lib/games";
import { useGameBroadcast } from "@/lib/game-broadcast";

const ROUNDS = 8;

interface Answered {
  round: QuoteRound;
  picked: string;
  correct: boolean;
}

export function WhoSaidItGame() {
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const { presentGameView } = useGameBroadcast();

  const rounds = useMemo<QuoteRound[]>(() =>
    shuffle(WHO_SAID_IT).slice(0, ROUNDS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round]);

  const idx = answers.length;
  const current = rounds[idx];
  const finished = idx >= rounds.length;

  const score = answers.filter(a => a.correct).length;
  const progressPct = (idx / rounds.length) * 100;

  const handlePick = (speaker: string) => {
    if (picked !== null) return;
    setPicked(speaker);
  };

  const handleNext = () => {
    if (picked === null || !current) return;
    setAnswers([...answers, { round: current, picked, correct: picked === current.speaker }]);
    setPicked(null);
  };

  const newGame = () => {
    setAnswers([]);
    setPicked(null);
    setRound(r => r + 1);
  };

  // Project the current quote (without the answer) for the audience.
  const sendQuoteToScreen = () => {
    if (!current) return;
    const correctIdx = current.options.indexOf(current.speaker);
    presentGameView("Who Said It?", `Quote ${idx + 1}`, {
      kind: "who-said-it",
      quote: current.quote,
      options: current.options,
      correctIndex: correctIdx,
      revealed: false,
      reference: current.reference,
      questionNum: idx + 1,
      totalNum: rounds.length,
    });
  };
  const sendAnswerToScreen = () => {
    if (!current) return;
    const correctIdx = current.options.indexOf(current.speaker);
    presentGameView("Who Said It? — Answer", current.speaker, {
      kind: "who-said-it",
      quote: current.quote,
      options: current.options,
      correctIndex: correctIdx,
      revealed: true,
      reference: current.reference,
      questionNum: idx + 1,
      totalNum: rounds.length,
    });
  };

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
              {pct === 100 ? "Perfect — you know your Bible voices!" :
               pct >= 75 ? "Excellent ear for Scripture." :
               pct >= 50 ? "Solid — keep reading and you'll catch them all." :
               "Keep learning — the more you read, the more you'll recognise."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={newGame} className="gap-2" data-testid="button-whosaid-new-game">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Review</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {answers.map((a, i) => (
              <div key={a.round.id} className={`rounded-lg border p-3 ${a.correct ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}>
                <div className="flex items-start gap-2">
                  {a.correct
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    : <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm italic">"{a.round.quote}"</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Spoken by: <span className="text-foreground">{a.round.speaker}</span>
                      {!a.correct && <> — you said: <span className="text-foreground">{a.picked}</span></>}
                      {a.round.reference && <> · {a.round.reference}</>}
                    </div>
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
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" data-testid="badge-whosaid-score">Score: {score} / {idx}</Badge>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={newGame} className="gap-1.5" data-testid="button-whosaid-restart">
          <RotateCcw className="w-3.5 h-3.5" /> Restart
        </Button>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Quote {idx + 1} of {rounds.length}</div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Quote className="w-6 h-6 text-primary shrink-0 mt-1" aria-hidden="true" />
            <CardTitle className="text-xl leading-snug italic" data-testid="whosaid-quote">
              "{current.quote}"
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground mb-2">Who said it?</p>
          {current.options.map((opt, i) => {
            const isPicked = picked === opt;
            const isCorrect = opt === current.speaker;
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
                onClick={() => handlePick(opt)}
                disabled={showResult}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${colour} disabled:cursor-default`}
                data-testid={`whosaid-option-${i}`}
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
            <div className="flex items-center justify-between gap-2 pt-3">
              {current.reference && (
                <div className="text-xs text-muted-foreground font-medium">{current.reference}</div>
              )}
              <Button onClick={handleNext} className="ml-auto gap-2" data-testid="button-whosaid-next">
                {idx + 1 === rounds.length ? "See Results" : "Next"} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send-to-screen controls */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button size="sm" variant="outline" onClick={sendQuoteToScreen} className="gap-1.5" data-testid="button-whosaid-send-quote">
          <Send className="w-3.5 h-3.5" /> Show quote on screen
        </Button>
        <Button size="sm" variant="outline" onClick={sendAnswerToScreen} className="gap-1.5" data-testid="button-whosaid-send-answer">
          <Send className="w-3.5 h-3.5" /> Reveal speaker on screen
        </Button>
      </div>
    </div>
  );
}
