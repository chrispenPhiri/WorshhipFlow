import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Trophy, Send } from "lucide-react";
import {
  TRIVIA, shuffle, type TriviaQuestion, type TriviaDifficulty,
} from "@/lib/games";
import { useGameBroadcast } from "@/lib/game-broadcast";

const QUESTIONS_PER_GAME = 10;

interface AnsweredQuestion {
  q: TriviaQuestion;
  picked: number;
  correct: boolean;
}

export function TriviaGame() {
  const [difficulty, setDifficulty] = useState<TriviaDifficulty | "Mixed">("Mixed");
  const [round, setRound] = useState(0); // increments to reseed questions
  const [answers, setAnswers] = useState<AnsweredQuestion[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const { presentGameView } = useGameBroadcast();

  const questions = useMemo<TriviaQuestion[]>(() => {
    const pool = difficulty === "Mixed" ? TRIVIA : TRIVIA.filter(q => q.difficulty === difficulty);
    return shuffle(pool).slice(0, QUESTIONS_PER_GAME);
    // round is a dependency so "New Game" reshuffles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, round]);

  const idx = answers.length;
  const current = questions[idx];
  const finished = idx >= questions.length;

  const score = answers.filter(a => a.correct).length;
  const progressPct = (idx / questions.length) * 100;

  const handlePick = (i: number) => {
    if (picked !== null || !current) return;
    setPicked(i);
  };

  const handleNext = () => {
    if (picked === null || !current) return;
    setAnswers([...answers, { q: current, picked, correct: picked === current.answerIndex }]);
    setPicked(null);
  };

  const newGame = () => {
    setAnswers([]);
    setPicked(null);
    setRound(r => r + 1);
  };

  // Project the current question to the broadcast window so the
  // congregation/group can read along.  We bake the four options into the
  // body with A / B / C / D prefixes — same as on the operator screen.
  const sendQuestionToScreen = () => {
    if (!current) return;
    presentGameView("Bible Trivia", `Question ${idx + 1}`, {
      kind: "trivia",
      question: current.question,
      options: current.options,
      correctIndex: current.answerIndex,
      revealed: false,
      reference: current.reference,
      explanation: current.explanation,
      difficulty: current.difficulty,
      questionNum: idx + 1,
      totalNum: questions.length,
    });
  };

  const sendAnswerToScreen = () => {
    if (!current) return;
    presentGameView("Bible Trivia — Answer", `Q${idx + 1}`, {
      kind: "trivia",
      question: current.question,
      options: current.options,
      correctIndex: current.answerIndex,
      revealed: true,
      reference: current.reference,
      explanation: current.explanation,
      difficulty: current.difficulty,
      questionNum: idx + 1,
      totalNum: questions.length,
    });
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const message =
      pct === 100 ? "Perfect score! Well done." :
      pct >= 80 ? "Great work — you know your Bible." :
      pct >= 50 ? "Good effort — keep studying." :
      "Keep at it — every question is a chance to learn.";
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-primary/20 text-primary rounded-full w-fit">
              <Trophy className="w-8 h-8" />
            </div>
            <CardTitle className="text-3xl mt-2">{score} / {questions.length}</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={newGame} className="gap-2" data-testid="button-trivia-new-game">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </CardContent>
        </Card>

        {/* Review list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {answers.map((a, i) => (
              <div key={a.q.id} className={`rounded-lg border p-3 ${a.correct ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}>
                <div className="flex items-start gap-2">
                  {a.correct
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
                    : <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" aria-hidden="true" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">Q{i + 1}. {a.q.question}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Correct answer: <span className="text-foreground">{a.q.options[a.q.answerIndex]}</span>
                      {!a.correct && <> — your answer: <span className="text-foreground">{a.q.options[a.picked]}</span></>}
                    </div>
                    {(a.q.reference || a.q.explanation) && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {a.q.reference && <span className="font-medium">{a.q.reference}</span>}
                        {a.q.reference && a.q.explanation && <span> — </span>}
                        {a.q.explanation}
                      </div>
                    )}
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
      {/* Difficulty + restart bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Difficulty:</span>
        {(["Mixed", "Easy", "Medium", "Hard"] as const).map(d => (
          <Button
            key={d}
            size="sm"
            variant={difficulty === d ? "default" : "outline"}
            onClick={() => { setDifficulty(d); newGame(); }}
            aria-pressed={difficulty === d}
            data-testid={`button-trivia-diff-${d.toLowerCase()}`}
          >
            {d}
          </Button>
        ))}
        <div className="flex-1" />
        <Badge variant="outline" data-testid="badge-trivia-score">Score: {score} / {idx}</Badge>
        <Button size="sm" variant="ghost" onClick={newGame} className="gap-1.5" data-testid="button-trivia-restart">
          <RotateCcw className="w-3.5 h-3.5" /> Restart
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Question {idx + 1} of {questions.length}</span>
          <Badge variant="outline" className="text-[10px] py-0">{current.difficulty}</Badge>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Question card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl leading-snug" data-testid="trivia-question">{current.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {current.options.map((opt, i) => {
            const isPicked = picked === i;
            const isCorrect = i === current.answerIndex;
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
                key={i}
                onClick={() => handlePick(i)}
                disabled={showResult}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${colour} disabled:cursor-default`}
                data-testid={`trivia-option-${i}`}
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
              <div className="text-xs text-muted-foreground">
                {current.reference && <span className="font-medium">{current.reference}</span>}
                {current.reference && current.explanation && " — "}
                {current.explanation}
              </div>
              <Button onClick={handleNext} className="gap-2" data-testid="button-trivia-next">
                {idx + 1 === questions.length ? "See Results" : "Next"} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send-to-screen controls — mirrors the per-game pattern so the
          audience can read the question along with the operator. */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button size="sm" variant="outline" onClick={sendQuestionToScreen} className="gap-1.5" data-testid="button-trivia-send-question">
          <Send className="w-3.5 h-3.5" /> Show question on screen
        </Button>
        <Button size="sm" variant="outline" onClick={sendAnswerToScreen} className="gap-1.5" data-testid="button-trivia-send-answer">
          <Send className="w-3.5 h-3.5" /> Reveal answer on screen
        </Button>
      </div>
    </div>
  );
}
