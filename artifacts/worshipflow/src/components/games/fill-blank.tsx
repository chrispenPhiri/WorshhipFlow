import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Trophy, Send } from "lucide-react";
import { FILL_BLANK, shuffle, type FillBlankRound, type TriviaDifficulty } from "@/lib/games";
import { useGameBroadcast } from "@/lib/game-broadcast";

const ROUNDS = 8;
const DIFFICULTIES: (TriviaDifficulty | "Mixed")[] = ["Mixed", "Easy", "Medium", "Hard"];

interface Answered {
  v: FillBlankRound;
  picked: string;
  correct: boolean;
}

export function FillBlankGame() {
  const [difficulty, setDifficulty] = useState<TriviaDifficulty | "Mixed">("Mixed");
  const [round, setRound] = useState(0);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const { presentOnScreen } = useGameBroadcast();

  const verses = useMemo<FillBlankRound[]>(() => {
    const pool = difficulty === "Mixed"
      ? FILL_BLANK
      : FILL_BLANK.filter(v => v.difficulty === difficulty);
    return shuffle(pool).slice(0, Math.min(ROUNDS, pool.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, round]);

  const idx = answers.length;
  const current = verses[idx];
  const finished = idx >= verses.length;
  const score = answers.filter(a => a.correct).length;
  const progressPct = (idx / Math.max(verses.length, 1)) * 100;

  const shuffledOptions = useMemo(() => {
    return current ? shuffle(current.options) : [];
  }, [current]);

  function pick(option: string) {
    if (picked !== null || !current) return;
    setPicked(option);
  }

  function next() {
    if (picked === null || !current) return;
    setAnswers(a => [...a, { v: current, picked, correct: picked === current.answer }]);
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

  function sendVerseToScreen() {
    if (!current) return;
    presentOnScreen(
      "Fill in the Blank",
      current.reference,
      `${current.verse.replace(/___/g, "______")}\n\n— ${current.reference}`,
    );
  }
  function sendAnswerToScreen() {
    if (!current) return;
    presentOnScreen(
      "Fill in the Blank — Answer",
      current.reference,
      `${current.verse.replace(/___/g, current.answer.toUpperCase())}\n\n— ${current.reference}`,
    );
  }

  if (finished) {
    const pct = Math.round((score / verses.length) * 100);
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-primary/20 text-primary rounded-full w-fit">
              <Trophy className="w-8 h-8" />
            </div>
            <CardTitle className="text-3xl mt-2" data-testid="text-fb-final-score">
              {score} / {verses.length}
            </CardTitle>
            <CardDescription>
              {pct === 100 ? "A perfect memory of Scripture." :
               pct >= 75 ? "Beautifully done." :
               pct >= 50 ? "A solid showing — review the verses below." :
                          "Keep going — every verse learnt is hidden in the heart."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={newGame} className="gap-2" data-testid="button-fb-new-game">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Review</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {answers.map(a => (
              <div key={a.v.id} className={`rounded-lg border p-3 ${a.correct ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}>
                <div className="flex items-start gap-2">
                  {a.correct
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    : <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      {a.v.verse.replace(/___/g, `“${a.v.answer}”`)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {a.v.reference}
                      {!a.correct && <> · you picked: <span className="text-foreground">{a.picked}</span></>}
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
      {/* Difficulty + score row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Difficulty:</span>
        {DIFFICULTIES.map(d => (
          <Button
            key={d}
            size="sm"
            variant={difficulty === d ? "default" : "outline"}
            onClick={() => changeDifficulty(d)}
            data-testid={`button-fb-difficulty-${d.toLowerCase()}`}
          >
            {d}
          </Button>
        ))}
        <div className="flex-1" />
        <Badge variant="outline" data-testid="badge-fb-score">Score: {score} / {idx}</Badge>
        <Button size="sm" variant="ghost" onClick={newGame} className="gap-1.5" data-testid="button-fb-restart">
          <RotateCcw className="w-3.5 h-3.5" /> Restart
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Verse {idx + 1} of {verses.length}</div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Verse card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl leading-snug" data-testid="fb-verse">
            {/* Render verse with the blank highlighted */}
            {renderVerseWithBlank(current.verse, picked === null ? null : current.answer, picked)}
          </CardTitle>
          <CardDescription>{current.reference}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {shuffledOptions.map(option => {
              const isPicked = picked === option;
              const isCorrect = option === current.answer;
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
                  key={option}
                  onClick={() => pick(option)}
                  disabled={showResult}
                  className={`p-3 rounded-lg border text-base font-medium transition-colors ${colour} disabled:cursor-default`}
                  data-testid={`button-fb-option-${option.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className="space-y-2">
              <div className={`text-sm rounded-md p-3 ${picked === current.answer ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}`}>
                <div className="font-medium">
                  {picked === current.answer ? "Correct!" : `The word was “${current.answer}”.`}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={next} className="gap-2" data-testid="button-fb-next">
                  {idx + 1 === verses.length ? "See Results" : "Next"} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send to screen */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button size="sm" variant="outline" onClick={sendVerseToScreen} className="gap-1.5" data-testid="button-fb-send-verse">
          <Send className="w-3.5 h-3.5" /> Show verse on screen
        </Button>
        <Button size="sm" variant="outline" onClick={sendAnswerToScreen} className="gap-1.5" data-testid="button-fb-send-answer">
          <Send className="w-3.5 h-3.5" /> Reveal answer on screen
        </Button>
      </div>
    </div>
  );
}

function renderVerseWithBlank(
  verse: string,
  revealedAnswer: string | null,
  picked: string | null,
) {
  const parts = verse.split("___");
  return parts.map((p, i) => (
    <span key={i}>
      {p}
      {i < parts.length - 1 && (
        <span
          className={`inline-block min-w-[5ch] mx-1 px-2 rounded border-b-2 ${
            revealedAnswer
              ? picked === revealedAnswer
                ? "border-emerald-400 text-emerald-300"
                : "border-rose-400 text-rose-300"
              : "border-primary text-primary"
          }`}
        >
          {revealedAnswer ?? "_____"}
        </span>
      )}
    </span>
  ));
}
