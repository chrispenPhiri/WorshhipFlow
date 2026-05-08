import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Gamepad2, Brain, BookOpen, Quote, Drama, ArrowLeft,
  Shuffle, Smile, SpellCheck, CheckCheck, Type as TypeIcon, UserCircle2,
  Grid3x3, PencilLine, Filter,
} from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { TriviaGame } from "@/components/games/trivia";
import { BooksOfBibleGame } from "@/components/games/books-of-bible";
import { WhoSaidItGame } from "@/components/games/who-said-it";
import { CharadesGame } from "@/components/games/charades";
import { VerseScrambleGame } from "@/components/games/verse-scramble";
import { EmojiQuizGame } from "@/components/games/emoji-quiz";
import { HangmanGame } from "@/components/games/hangman";
import { TrueOrFalseGame } from "@/components/games/true-or-false";
import { SpellItGame } from "@/components/games/spell-it";
import { TwoTruthsGame } from "@/components/games/two-truths";
import { ConnectionsGame } from "@/components/games/connections";
import { FillBlankGame } from "@/components/games/fill-blank";
import { OddOneOutGame } from "@/components/games/odd-one-out";

type ActiveGame =
  | null
  | "trivia"
  | "books"
  | "whosaid"
  | "charades"
  | "scramble"
  | "emoji"
  | "hangman"
  | "trueorfalse"
  | "spell"
  | "twotruths"
  | "connections"
  | "fillblank"
  | "oddoneout";

interface GameMeta {
  id: Exclude<ActiveGame, null>;
  title: string;
  description: string;
  icon: typeof Brain;
  badge: string;
  colour: string;
}

const GAMES: GameMeta[] = [
  {
    id: "trivia",
    title: "Bible Trivia",
    description: "10 multiple-choice questions per round. Pick a difficulty (Easy / Medium / Hard) or play Mixed.",
    icon: Brain,
    badge: "40 questions",
    colour: "text-amber-400",
  },
  {
    id: "books",
    title: "Books of the Bible",
    description: "Place the books of the Old or New Testament in the correct order. Instant feedback as you go.",
    icon: BookOpen,
    badge: "39 OT + 27 NT",
    colour: "text-emerald-400",
  },
  {
    id: "whosaid",
    title: "Who Said It?",
    description: "Guess which Bible figure spoke each famous line. 8 quotes per round.",
    icon: Quote,
    badge: "20 quotes",
    colour: "text-sky-400",
  },
  {
    id: "charades",
    title: "Bible Charades",
    description: "Draw a random card and act out the Bible person, event, or parable for your group to guess.",
    icon: Drama,
    badge: "30 cards",
    colour: "text-fuchsia-400",
  },
  {
    id: "scramble",
    title: "Verse Scramble",
    description: "Tap the words in the right order to rebuild a familiar verse. Send the puzzle to the projection screen.",
    icon: Shuffle,
    badge: "18 verses",
    colour: "text-violet-400",
  },
  {
    id: "emoji",
    title: "Bible Emoji Quiz",
    description: "Guess the Bible story, person, or parable from a row of emojis. Big, fun, and great on the projector.",
    icon: Smile,
    badge: "20 puzzles",
    colour: "text-rose-400",
  },
  {
    id: "hangman",
    title: "Bible Hangman",
    description: "Classic letter-by-letter word guessing with Bible names, places, and events. Six lives per round.",
    icon: SpellCheck,
    badge: "25 words",
    colour: "text-cyan-400",
  },
  {
    id: "trueorfalse",
    title: "True or False",
    description: "Quick-fire Bible statements — pick true or false. Choose Easy / Medium / Hard or Mixed.",
    icon: CheckCheck,
    badge: "30 statements",
    colour: "text-lime-400",
  },
  {
    id: "spell",
    title: "Bible Spell-It",
    description: "Read a clue and tap letters in order to spell the Bible word from a small letter pool.",
    icon: TypeIcon,
    badge: "25 words",
    colour: "text-orange-400",
  },
  {
    id: "twotruths",
    title: "Two Truths and a Lie",
    description: "Three statements about a Bible figure — two are true, one is false. Spot the lie.",
    icon: UserCircle2,
    badge: "10 figures",
    colour: "text-pink-400",
  },
  {
    id: "connections",
    title: "Bible Connections",
    description: "Sort 16 Bible items into 4 hidden groups of 4. NYT-style, four mistakes allowed per puzzle.",
    icon: Grid3x3,
    badge: "8 puzzles",
    colour: "text-teal-400",
  },
  {
    id: "fillblank",
    title: "Fill in the Blank",
    description: "A familiar KJV verse with one word missing. Pick the right word from four choices.",
    icon: PencilLine,
    badge: "22 verses",
    colour: "text-yellow-400",
  },
  {
    id: "oddoneout",
    title: "Odd One Out",
    description: "Four Bible items — three belong together, one doesn't. Tap the odd one and learn the link.",
    icon: Filter,
    badge: "20 rounds",
    colour: "text-indigo-400",
  },
];

export default function GamesPage() {
  const [active, setActive] = useLocalStorage<ActiveGame>("wf-active-game", null);

  const activeMeta = GAMES.find(g => g.id === active);

  if (active && activeMeta) {
    const Icon = activeMeta.icon;
    return (
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setActive(null)} className="gap-1.5" data-testid="button-back-to-games">
            <ArrowLeft className="w-4 h-4" /> All Games
          </Button>
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${activeMeta.colour}`} aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight">{activeMeta.title}</h1>
          </div>
        </div>

        {active === "trivia" && <TriviaGame />}
        {active === "books" && <BooksOfBibleGame />}
        {active === "whosaid" && <WhoSaidItGame />}
        {active === "charades" && <CharadesGame />}
        {active === "scramble" && <VerseScrambleGame />}
        {active === "emoji" && <EmojiQuizGame />}
        {active === "hangman" && <HangmanGame />}
        {active === "trueorfalse" && <TrueOrFalseGame />}
        {active === "spell" && <SpellItGame />}
        {active === "twotruths" && <TwoTruthsGame />}
        {active === "connections" && <ConnectionsGame />}
        {active === "fillblank" && <FillBlankGame />}
        {active === "oddoneout" && <OddOneOutGame />}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-lg text-primary">
          <Gamepad2 className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Bible Games</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Fun, scripture-rooted games for youth nights, fellowship meetings, family time, or as a service warm-up.
          </p>
        </div>
        <Badge variant="outline" className="hidden sm:flex">{GAMES.length} games</Badge>
      </div>

      {/* Game grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {GAMES.map(g => {
          const Icon = g.icon;
          return (
            <Card key={g.id} className="hover:border-primary/40 transition-colors">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg bg-muted ${g.colour}`}>
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl">{g.title}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-[10px] py-0">{g.badge}</Badge>
                  </div>
                </div>
                <CardDescription className="mt-3">{g.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setActive(g.id)}
                  className="gap-2 w-full"
                  data-testid={`button-start-${g.id}`}
                >
                  Start
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground text-center pt-4">
        All games work offline — no internet needed.
      </div>
    </div>
  );
}
