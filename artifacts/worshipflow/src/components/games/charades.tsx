import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shuffle, Eye, EyeOff, Lightbulb } from "lucide-react";
import { CHARADES, shuffle, type CharadeCard } from "@/lib/games";

export function CharadesGame() {
  const [deck, setDeck] = useState<CharadeCard[]>(() => shuffle(CHARADES));
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const current = deck[idx % deck.length];

  const next = () => {
    setRevealed(false);
    setShowHint(false);
    if (idx + 1 >= deck.length) {
      // Reshuffle when we exhaust the deck
      setDeck(shuffle(CHARADES));
      setIdx(0);
    } else {
      setIdx(idx + 1);
    }
  };

  if (!current) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-lg">Bible Charades</CardTitle>
          <CardDescription>
            One person draws a card and acts it out (no words). The rest of the group guesses.
            Tap the card to reveal — keep it hidden from the actor's audience.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-primary/40">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <Badge variant="outline" data-testid="badge-charade-category">{current.category}</Badge>

            {revealed ? (
              <>
                <div className="text-3xl sm:text-4xl font-bold leading-tight" data-testid="charade-prompt">
                  {current.prompt}
                </div>
                {/* Hint is gated by the Show/Hide hint toggle below — see line ~105. */}
              </>
            ) : (
              <>
                <button
                  onClick={() => setRevealed(true)}
                  className="w-full max-w-md aspect-[3/2] rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-center text-center px-6"
                  data-testid="button-reveal-charade"
                >
                  <div className="space-y-2">
                    <Eye className="w-8 h-8 mx-auto text-primary" aria-hidden="true" />
                    <div className="font-semibold">Tap to reveal card</div>
                    <div className="text-xs text-muted-foreground">Only the actor should look.</div>
                  </div>
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 flex-wrap justify-center">
        {revealed && current.hint && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowHint(s => !s)}
            className="gap-1.5"
            data-testid="button-toggle-hint"
          >
            <Lightbulb className="w-3.5 h-3.5" /> {showHint ? "Hide" : "Show"} hint
          </Button>
        )}
        {revealed && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRevealed(false)}
            className="gap-1.5"
            data-testid="button-hide-charade"
          >
            <EyeOff className="w-3.5 h-3.5" /> Hide card
          </Button>
        )}
        <Button onClick={next} className="gap-2" data-testid="button-next-charade">
          <Shuffle className="w-4 h-4" /> Next card
        </Button>
      </div>

      {showHint && current.hint && (
        <div className="text-center text-sm text-muted-foreground italic">
          Hint: {current.hint}
        </div>
      )}
    </div>
  );
}
