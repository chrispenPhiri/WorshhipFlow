/**
 * Structured payloads for projecting game state onto the broadcast screen.
 *
 * The earlier implementation flattened everything into a `custom_text`
 * string, which gave us a single-text-blob view on the projector.  This
 * module gives every game its own typed shape so the broadcast can render
 * the same coloured cards / option blocks / letter grids that the
 * operator sees — just blown up to stage size.
 *
 * Wire format (no schema migration needed):
 *   contentType: "game"
 *   title:       gameLabel  (e.g. "Bible Trivia — Question 4")
 *   content:     JSON.stringify(payload)  ← discriminated union below
 *
 * The broadcast renderer parses `content` when contentType === "game"
 * and feeds the payload to <GameStageView>.  Older `custom_text` game
 * sends still work because we never removed that path.
 */

export type GameStagePayload =
  | TriviaStagePayload
  | TwoTruthsStagePayload
  | TrueFalseStagePayload
  | CharadesStagePayload
  | HangmanStagePayload
  | EmojiQuizStagePayload
  | VerseScrambleStagePayload
  | WhoSaidItStagePayload
  | SpellItStagePayload;

export interface TriviaStagePayload {
  kind: "trivia";
  question: string;
  options: string[];
  correctIndex: number;
  /** When true, render correct/incorrect colouring on the options. */
  revealed: boolean;
  reference?: string;
  explanation?: string;
  difficulty?: string;
  questionNum?: number;
  totalNum?: number;
}

export interface TwoTruthsStagePayload {
  kind: "two-truths";
  subject: string;
  statements: string[];
  lieIndex: number;
  revealed: boolean;
  explanation?: string;
  reference?: string;
  round?: number;
  total?: number;
}

export interface TrueFalseStagePayload {
  kind: "true-false";
  statement: string;
  answer: boolean;
  revealed: boolean;
  explanation?: string;
  reference?: string;
  round?: number;
  total?: number;
}

export interface CharadesStagePayload {
  kind: "charades";
  prompt: string;
  category: string;
  hint?: string;
}

export interface HangmanStagePayload {
  kind: "hangman";
  /** The masked word with underscores for un-guessed letters and spaces preserved. */
  display: string;
  category: string;
  wrongLetters: string[];
  livesUsed: number;
  livesMax: number;
  revealed: boolean;
  /** Full word — only included when revealed=true. */
  word?: string;
  hint?: string;
}

export interface EmojiQuizStagePayload {
  kind: "emoji-quiz";
  emojis: string;
  category: string;
  options: string[];
  /** Index into options of the correct answer; -1 when unknown. */
  correctIndex: number;
  revealed: boolean;
  hint?: string;
  round?: number;
  total?: number;
}

export interface VerseScrambleStagePayload {
  kind: "verse-scramble";
  /** Words in the *display order* the operator wants on the projector
   *  (scrambled when revealed=false; in original order when revealed=true). */
  words: string[];
  reference: string;
  revealed: boolean;
  hint?: string;
}

export interface WhoSaidItStagePayload {
  kind: "who-said-it";
  quote: string;
  options: string[];
  correctIndex: number;
  revealed: boolean;
  reference?: string;
  questionNum?: number;
  totalNum?: number;
}

export interface SpellItStagePayload {
  kind: "spell-it";
  clue: string;
  category: string;
  wordLength: number;
  revealed: boolean;
  /** Full word — only included when revealed=true. */
  word?: string;
}

/**
 * Safely decode the JSON wire format.  Returns null if the content isn't
 * a *valid* game payload (recognised kind + the required shape for that
 * kind) — the broadcast renderer falls back to its normal text path in
 * that case so we never feed half-broken data into <GameStageView>.
 */
export function tryDecodeGamePayload(raw: string | null | undefined): GameStagePayload | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return validateGamePayload(parsed);
}

function validateGamePayload(p: unknown): GameStagePayload | null {
  if (!p || typeof p !== "object") return null;
  const obj = p as Record<string, unknown>;
  if (typeof obj.kind !== "string") return null;

  const isStr = (v: unknown): v is string => typeof v === "string";
  const isBool = (v: unknown): v is boolean => typeof v === "boolean";
  const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
  const isStrArr = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every(isStr);

  switch (obj.kind) {
    case "trivia":
      if (!isStr(obj.question) || !isStrArr(obj.options) || !isNum(obj.correctIndex) || !isBool(obj.revealed)) return null;
      return obj as unknown as TriviaStagePayload;
    case "two-truths":
      if (!isStr(obj.subject) || !isStrArr(obj.statements) || !isNum(obj.lieIndex) || !isBool(obj.revealed)) return null;
      return obj as unknown as TwoTruthsStagePayload;
    case "true-false":
      if (!isStr(obj.statement) || !isBool(obj.answer) || !isBool(obj.revealed)) return null;
      return obj as unknown as TrueFalseStagePayload;
    case "charades":
      if (!isStr(obj.prompt) || !isStr(obj.category)) return null;
      return obj as unknown as CharadesStagePayload;
    case "hangman":
      if (!isStr(obj.display) || !isStr(obj.category) || !isStrArr(obj.wrongLetters) ||
          !isNum(obj.livesUsed) || !isNum(obj.livesMax) || !isBool(obj.revealed)) return null;
      return obj as unknown as HangmanStagePayload;
    case "emoji-quiz":
      if (!isStr(obj.emojis) || !isStr(obj.category) || !isStrArr(obj.options) ||
          !isNum(obj.correctIndex) || !isBool(obj.revealed)) return null;
      return obj as unknown as EmojiQuizStagePayload;
    case "verse-scramble":
      if (!isStrArr(obj.words) || !isStr(obj.reference) || !isBool(obj.revealed)) return null;
      return obj as unknown as VerseScrambleStagePayload;
    case "who-said-it":
      if (!isStr(obj.quote) || !isStrArr(obj.options) || !isNum(obj.correctIndex) || !isBool(obj.revealed)) return null;
      return obj as unknown as WhoSaidItStagePayload;
    case "spell-it":
      if (!isStr(obj.clue) || !isStr(obj.category) || !isNum(obj.wordLength) || !isBool(obj.revealed)) return null;
      return obj as unknown as SpellItStagePayload;
    default:
      return null;
  }
}

export function encodeGamePayload(payload: GameStagePayload): string {
  return JSON.stringify(payload);
}
