import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, ArrowRight, Trophy, XCircle, Heart, Send } from "lucide-react";
import {
  CONNECTIONS,
  shuffle,
  type ConnectionsPuzzle,
  type ConnectionsCategory,
  type ConnectionsDifficulty,
} from "@/lib/games";
import { useGameBroadcast } from "@/lib/game-broadcast";

const LIVES = 4;

const DIFFICULTY_BG: Record<ConnectionsDifficulty, string> = {
  Easy:   "bg-emerald-500/20 border-emerald-500/60 text-emerald-200",
  Medium: "bg-amber-500/20 border-amber-500/60 text-amber-100",
  Hard:   "bg-sky-500/20 border-sky-500/60 text-sky-100",
  Tricky: "bg-fuchsia-500/20 border-fuchsia-500/60 text-fuchsia-100",
};

interface BoardItem {
  text: string;
  /** Index into puzzle.categories (0..3) — the group this item belongs to. */
  group: number;
}

export function ConnectionsGame() {
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const puzzle: ConnectionsPuzzle = CONNECTIONS[puzzleIdx % CONNECTIONS.length]!;

  // Board = the unsolved tiles, in their current shuffled order.
  // Solved categories collapse out and become coloured banner rows above.
  const [board, setBoard] = useState<BoardItem[]>(() => initialBoard(puzzle));
  const [solved, setSolved] = useState<ConnectionsCategory[]>([]);
  // Selection is tracked by stable item identity (the item text), NOT by
  // board index — so that Shuffle / solving a category doesn't silently
  // re-target the user's picks to different tiles.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lives, setLives] = useState(LIVES);
  const [shake, setShake] = useState(false);
  const [oneAway, setOneAway] = useState(false);
  const [revealedAll, setRevealedAll] = useState<ConnectionsCategory[] | null>(null);
  const { presentOnScreen } = useGameBroadcast();

  const lost = lives === 0 && solved.length < 4;
  const won = solved.length === 4;
  const finished = won || lost;

  // Auto-reveal remaining categories on loss — kept in an effect so it
  // never fires from render (which can run multiple times under React's
  // concurrent / strict-mode semantics and schedule duplicate updates).
  useEffect(() => {
    if (lost && revealedAll === null) {
      const solvedNames = new Set(solved.map(c => c.name));
      setRevealedAll(puzzle.categories.filter(c => !solvedNames.has(c.name)));
    }
  }, [lost, revealedAll, solved, puzzle]);

  function toggle(text: string) {
    if (finished) return;
    setOneAway(false);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(text)) next.delete(text);
      else if (next.size < 4) next.add(text);
      return next;
    });
  }

  function deselect() {
    setSelected(new Set());
    setOneAway(false);
  }

  function shuffleBoard() {
    // Re-arrange visible tiles. Selection (keyed by item text) survives
    // the shuffle automatically.
    setBoard(b => shuffle(b));
  }

  function submit() {
    if (selected.size !== 4 || finished) return;
    const picks = board.filter(b => selected.has(b.text));
    if (picks.length !== 4) return; // safety
    const groups = picks.map(p => p.group);
    const allSame = groups.every(g => g === groups[0]);

    if (allSame) {
      const cat = puzzle.categories[groups[0]!]!;
      setSolved(s => [...s, cat]);
      setBoard(b => b.filter(item => !selected.has(item.text)));
      setSelected(new Set());
      setOneAway(false);
      return;
    }

    // Wrong — cost a life. Detect "one away" (3 of 4 same group).
    const counts = new Map<number, number>();
    for (const g of groups) counts.set(g, (counts.get(g) ?? 0) + 1);
    const closest = Math.max(...counts.values());
    setOneAway(closest === 3);
    setShake(true);
    setTimeout(() => setShake(false), 450);
    setLives(l => Math.max(0, l - 1));
  }

  function newPuzzle(advance: boolean) {
    const next = advance ? (puzzleIdx + 1) % CONNECTIONS.length : puzzleIdx;
    const nextPuzzle = CONNECTIONS[next]!;
    setPuzzleIdx(next);
    setBoard(initialBoard(nextPuzzle));
    setSolved([]);
    setSelected(new Set());
    setLives(LIVES);
    setOneAway(false);
    setRevealedAll(null);
  }

  function sendPuzzleToScreen() {
    const remaining = board.map(b => b.text);
    presentOnScreen(
      "Bible Connections",
      puzzle.title,
      `Find four groups of four:\n\n${chunk4(remaining).map(row => row.join("   ·   ")).join("\n")}`,
    );
  }
  function sendSolutionToScreen() {
    const lines = puzzle.categories
      .map(c => `${c.name.toUpperCase()}: ${c.items.join(" · ")}`)
      .join("\n\n");
    presentOnScreen("Bible Connections — Solution", puzzle.title, lines);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{puzzle.title}</CardTitle>
              <CardDescription>
                Find four groups of four. Pick four items you think belong together, then submit.
              </CardDescription>
            </div>
            <Badge variant="outline" data-testid="badge-connections-puzzle">
              Puzzle {(puzzleIdx % CONNECTIONS.length) + 1} / {CONNECTIONS.length}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Solved category banners (collapsed rows) */}
      {solved.length > 0 && (
        <div className="space-y-2">
          {solved.map(cat => (
            <div
              key={cat.name}
              className={`rounded-lg border p-3 text-center font-semibold ${DIFFICULTY_BG[cat.difficulty]}`}
              data-testid={`banner-solved-${cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <div className="text-sm uppercase tracking-wider opacity-90">{cat.name}</div>
              <div className="text-base mt-0.5">{cat.items.join(" · ")}</div>
            </div>
          ))}
        </div>
      )}

      {/* Active grid (unsolved tiles) */}
      {board.length > 0 && (
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${shake ? "animate-pulse" : ""}`}>
          {board.map(item => {
            const isSelected = selected.has(item.text);
            return (
              <button
                key={item.text}
                onClick={() => toggle(item.text)}
                disabled={finished}
                className={`min-h-[64px] sm:min-h-[80px] rounded-lg border px-2 py-2 text-sm sm:text-[0.95rem] font-medium leading-tight transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 border-border hover:bg-muted"
                } disabled:cursor-default`}
                data-testid={`tile-${item.text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                {item.text}
              </button>
            );
          })}
        </div>
      )}

      {/* Lives + status */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5" data-testid="connections-lives">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Mistakes left:</span>
          {Array.from({ length: LIVES }).map((_, i) => (
            <Heart
              key={i}
              className={`w-4 h-4 ${i < lives ? "fill-rose-400 text-rose-400" : "text-muted-foreground/40"}`}
            />
          ))}
        </div>
        {oneAway && !finished && (
          <span className="text-xs text-amber-300" data-testid="text-one-away">One away!</span>
        )}
      </div>

      {/* Action row */}
      {!finished && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <Button variant="outline" size="sm" onClick={shuffleBoard} data-testid="button-connections-shuffle">
            Shuffle
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={deselect}
            disabled={selected.size === 0}
            data-testid="button-connections-deselect"
          >
            Deselect all
          </Button>
          <Button
            onClick={submit}
            disabled={selected.size !== 4}
            className="gap-2"
            data-testid="button-connections-submit"
          >
            Submit
          </Button>
        </div>
      )}

      {/* Send-to-screen controls (operator-facing projection) */}
      {!finished && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <Button size="sm" variant="outline" onClick={sendPuzzleToScreen} className="gap-1.5" data-testid="button-connections-send-puzzle">
            <Send className="w-3.5 h-3.5" /> Show puzzle on screen
          </Button>
          <Button size="sm" variant="outline" onClick={sendSolutionToScreen} className="gap-1.5" data-testid="button-connections-send-solution">
            <Send className="w-3.5 h-3.5" /> Reveal solution on screen
          </Button>
        </div>
      )}

      {/* Game over */}
      {finished && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-primary/20 text-primary rounded-full w-fit">
              {won ? <Trophy className="w-8 h-8" /> : <XCircle className="w-8 h-8 text-rose-400" />}
            </div>
            <CardTitle className="text-2xl mt-2" data-testid="text-connections-result">
              {won ? "All four groups solved!" : "Out of guesses"}
            </CardTitle>
            <CardDescription>
              {won
                ? `${LIVES - lives === 0 ? "Perfect game" : `${LIVES - lives} mistake${LIVES - lives === 1 ? "" : "s"}`} on this puzzle.`
                : "Here are the groups you didn't get:"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!won && revealedAll && revealedAll.map(cat => (
              <div
                key={cat.name}
                className={`rounded-lg border p-3 text-center ${DIFFICULTY_BG[cat.difficulty]}`}
              >
                <div className="text-sm uppercase tracking-wider opacity-90">{cat.name}</div>
                <div className="text-base mt-0.5">{cat.items.join(" · ")}</div>
              </div>
            ))}
            <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
              <Button onClick={() => newPuzzle(false)} variant="outline" className="gap-2" data-testid="button-connections-retry">
                <RotateCcw className="w-4 h-4" /> Retry this puzzle
              </Button>
              <Button onClick={() => newPuzzle(true)} className="gap-2" data-testid="button-connections-next-puzzle">
                <ArrowRight className="w-4 h-4" /> Next puzzle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function initialBoard(p: ConnectionsPuzzle): BoardItem[] {
  const items: BoardItem[] = [];
  p.categories.forEach((cat, gi) => {
    for (const text of cat.items) items.push({ text, group: gi });
  });
  return shuffle(items);
}

function chunk4<T>(arr: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += 4) rows.push(arr.slice(i, i + 4));
  return rows;
}
