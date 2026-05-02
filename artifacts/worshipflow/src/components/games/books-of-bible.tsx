import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, RotateCcw, Trophy, X } from "lucide-react";
import {
  OLD_TESTAMENT_BOOKS, NEW_TESTAMENT_BOOKS, shuffle,
} from "@/lib/games";

type Testament = "OT" | "NT";

interface PlacedBook {
  book: string;
  position: number;       // 0-indexed slot the user clicked / dropped into
  correct: boolean;
}

export function BooksOfBibleGame() {
  const [testament, setTestament] = useState<Testament>("NT"); // NT is shorter & friendlier to start
  const [round, setRound] = useState(0);
  const [placed, setPlaced] = useState<PlacedBook[]>([]);

  const correctOrder = testament === "OT" ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS;

  const shuffledPool = useMemo(() => shuffle(correctOrder),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [testament, round]);

  const placedBookSet = new Set(placed.map(p => p.book));
  const remaining = shuffledPool.filter(b => !placedBookSet.has(b));

  const finished = placed.length === correctOrder.length;
  const correctCount = placed.filter(p => p.correct).length;

  const placeBook = (book: string) => {
    if (finished) return;
    const nextPos = placed.length;
    const isCorrect = correctOrder[nextPos] === book;
    setPlaced([...placed, { book, position: nextPos, correct: isCorrect }]);
  };

  const undo = () => {
    if (placed.length === 0) return;
    setPlaced(placed.slice(0, -1));
  };

  const reset = () => {
    setPlaced([]);
    setRound(r => r + 1);
  };

  const switchTestament = (t: Testament) => {
    setTestament(t);
    setPlaced([]);
    setRound(r => r + 1);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Testament:</span>
        <Button
          size="sm"
          variant={testament === "NT" ? "default" : "outline"}
          onClick={() => switchTestament("NT")}
          aria-pressed={testament === "NT"}
          data-testid="button-books-nt"
        >
          New Testament (27)
        </Button>
        <Button
          size="sm"
          variant={testament === "OT" ? "default" : "outline"}
          onClick={() => switchTestament("OT")}
          aria-pressed={testament === "OT"}
          data-testid="button-books-ot"
        >
          Old Testament (39)
        </Button>
        <div className="flex-1" />
        <Badge variant="outline" data-testid="badge-books-progress">
          {placed.length} / {correctOrder.length}
        </Badge>
        <Button size="sm" variant="ghost" onClick={undo} disabled={placed.length === 0} data-testid="button-books-undo">
          Undo
        </Button>
        <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5" data-testid="button-books-reset">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </Button>
      </div>

      {finished && (
        <Card className="border-primary/40">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-primary/20 text-primary rounded-full w-fit">
              <Trophy className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl mt-2">{correctCount} / {correctOrder.length} correct</CardTitle>
            <CardDescription>
              {correctCount === correctOrder.length
                ? "Flawless! You know the order by heart."
                : `${correctOrder.length - correctCount} were out of place. Try again to improve.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={reset} className="gap-2" data-testid="button-books-play-again">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Available books */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pick the next book</CardTitle>
            <CardDescription className="text-xs">
              Tap books in the order they appear in the Bible.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-3 pt-0">
            <ScrollArea className="h-[360px]">
              <div className="flex flex-wrap gap-1.5 p-1">
                {remaining.length === 0 && (
                  <p className="text-sm text-muted-foreground py-8 text-center w-full">
                    All books placed. See your score above.
                  </p>
                )}
                {remaining.map(book => (
                  <button
                    key={book}
                    onClick={() => placeBook(book)}
                    className="px-2.5 py-1.5 text-sm rounded-md border border-border hover:border-primary/60 hover:bg-primary/5 transition-colors"
                    data-testid={`book-pool-${book.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {book}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Placed sequence */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your sequence</CardTitle>
            <CardDescription className="text-xs">
              Green = correct position; red = wrong position.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-3 pt-0">
            <ScrollArea className="h-[360px]">
              <ol className="space-y-1 p-1" data-testid="books-placed-list">
                {placed.length === 0 && (
                  <li className="text-sm text-muted-foreground py-8 text-center">
                    No books placed yet.
                  </li>
                )}
                {placed.map((p, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-sm ${
                      p.correct
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-rose-500/40 bg-rose-500/5"
                    }`}
                  >
                    <span className="text-xs text-muted-foreground w-6 text-right">{i + 1}.</span>
                    <span className="flex-1">{p.book}</span>
                    {p.correct
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      : <X className="w-3.5 h-3.5 text-rose-400" />}
                    {!p.correct && (
                      <span className="text-xs text-muted-foreground">
                        (should be: {correctOrder[i]})
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
