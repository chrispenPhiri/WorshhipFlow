/**
 * <GameStageView> — renders a structured game payload at presentation
 * scale.  Used by both the broadcast page and the operator's live preview
 * (at a smaller `baseFontSize` for the latter).
 *
 * Design rules:
 *  - All inner sizes use `em` units so the entire card scales when the
 *    parent's `font-size` changes.  Broadcast passes ~64px on a 1080p
 *    stage; the live-preview pane passes ~10px so it fits the 16:9
 *    thumbnail.
 *  - Colours come from the operator's textStyle (fontFamily / textColor /
 *    accentColor) where it makes sense, but state colours (correct /
 *    wrong / lives) are baked in so the game UI reads correctly on any
 *    background.
 *  - Component is fully self-contained — no shadcn/lucide deps that
 *    might stylise unexpectedly on the broadcast tab; just inline SVG
 *    and inline styles.
 */

import type { CSSProperties, ReactNode } from "react";
import type {
  GameStagePayload,
  TriviaStagePayload,
  TwoTruthsStagePayload,
  TrueFalseStagePayload,
  CharadesStagePayload,
  HangmanStagePayload,
  EmojiQuizStagePayload,
  VerseScrambleStagePayload,
  WhoSaidItStagePayload,
  SpellItStagePayload,
  ConnectionsStagePayload,
  FillBlankStagePayload,
  OddOneOutStagePayload,
} from "@/lib/game-stage-payload";

interface Props {
  payload: GameStagePayload;
  /** Base font size in pixels — controls the overall scale of the card. */
  baseFontSize: number;
  /** Optional theming hints from screen state. */
  textStyle?: {
    fontFamily?: string | null;
    textColor?: string | null;
    accentColor?: string | null;
  };
}

const COLOR_OK = "#10b981";       // emerald-500
const COLOR_OK_BG = "rgba(16,185,129,0.15)";
const COLOR_OK_BORDER = "rgba(16,185,129,0.55)";
const COLOR_WRONG = "#f43f5e";    // rose-500
const COLOR_WRONG_BG = "rgba(244,63,94,0.13)";
const COLOR_WRONG_BORDER = "rgba(244,63,94,0.55)";
const COLOR_NEUTRAL_BG = "rgba(255,255,255,0.05)";
const COLOR_NEUTRAL_BORDER = "rgba(255,255,255,0.18)";
const COLOR_MUTED = "rgba(255,255,255,0.6)";

export function GameStageView({ payload, baseFontSize, textStyle }: Props) {
  const fontFamily = textStyle?.fontFamily ?? "Georgia, 'Times New Roman', serif";
  const textColor = textStyle?.textColor ?? "#ffffff";
  const accent = textStyle?.accentColor ?? "#f59e0b";

  const containerStyle: CSSProperties = {
    fontSize: `${baseFontSize}px`,
    fontFamily,
    color: textColor,
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "0.5em",
    alignItems: "stretch",
    justifyContent: "center",
    lineHeight: 1.3,
  };

  return (
    <div style={containerStyle} data-testid={`game-stage-${payload.kind}`}>
      {renderBody(payload, accent)}
    </div>
  );
}

function renderBody(payload: GameStagePayload, accent: string): ReactNode {
  switch (payload.kind) {
    case "trivia":       return <TriviaBody p={payload} accent={accent} />;
    case "two-truths":   return <TwoTruthsBody p={payload} accent={accent} />;
    case "true-false":   return <TrueFalseBody p={payload} accent={accent} />;
    case "charades":     return <CharadesBody p={payload} accent={accent} />;
    case "hangman":      return <HangmanBody p={payload} accent={accent} />;
    case "emoji-quiz":   return <EmojiQuizBody p={payload} accent={accent} />;
    case "verse-scramble": return <VerseScrambleBody p={payload} accent={accent} />;
    case "who-said-it":  return <WhoSaidItBody p={payload} accent={accent} />;
    case "spell-it":     return <SpellItBody p={payload} accent={accent} />;
    case "connections":  return <ConnectionsBody p={payload} accent={accent} />;
    case "fill-blank":   return <FillBlankBody p={payload} accent={accent} />;
    case "odd-one-out":  return <OddOneOutBody p={payload} accent={accent} />;
  }
}

// ── Shared building blocks ───────────────────────────────────────────────────

function GameLabel({ text, accent }: { text: string; accent: string }) {
  return (
    <div style={{
      alignSelf: "center",
      display: "inline-block",
      background: `${accent}22`,
      color: accent,
      border: `0.04em solid ${accent}55`,
      fontSize: "0.32em",
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      padding: "0.45em 1.1em",
      borderRadius: "999em",
    }}>
      {text}
    </div>
  );
}

function ProgressLine({ current, total }: { current: number; total: number }) {
  if (!total) return null;
  return (
    <div style={{ alignSelf: "center", fontSize: "0.28em", color: COLOR_MUTED, letterSpacing: "0.04em" }}>
      {current} / {total}
    </div>
  );
}

function CardWrap({ children, borderColor }: { children: ReactNode; borderColor?: string }) {
  return (
    <div style={{
      background: "rgba(15,15,20,0.55)",
      border: `0.04em solid ${borderColor ?? "rgba(255,255,255,0.14)"}`,
      borderRadius: "0.5em",
      padding: "0.7em 0.9em",
      backdropFilter: "blur(8px)",
    }}>
      {children}
    </div>
  );
}

function OptionRow({
  letter, text, state,
}: {
  letter: string;
  text: string;
  state: "neutral" | "correct" | "wrong" | "dim";
}) {
  let bg = COLOR_NEUTRAL_BG;
  let border = COLOR_NEUTRAL_BORDER;
  let opacity = 1;
  let trailingMark: ReactNode = null;
  if (state === "correct") {
    bg = COLOR_OK_BG; border = COLOR_OK_BORDER;
    trailingMark = <CheckMark color={COLOR_OK} />;
  } else if (state === "wrong") {
    bg = COLOR_WRONG_BG; border = COLOR_WRONG_BORDER;
    trailingMark = <XMark color={COLOR_WRONG} />;
  } else if (state === "dim") {
    opacity = 0.55;
  }
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5em",
      background: bg,
      border: `0.04em solid ${border}`,
      borderRadius: "0.4em",
      padding: "0.5em 0.7em",
      opacity,
    }}>
      <div style={{
        flexShrink: 0,
        width: "1.4em", height: "1.4em",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.12)",
        color: "rgba(255,255,255,0.92)",
        fontSize: "0.65em",
        fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {letter}
      </div>
      <div style={{ flex: 1, fontSize: "0.7em", lineHeight: 1.3 }}>{text}</div>
      {trailingMark}
    </div>
  );
}

function CheckMark({ color }: { color: string }) {
  return (
    <svg width="0.9em" height="0.9em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function XMark({ color }: { color: string }) {
  return (
    <svg width="0.9em" height="0.9em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="0.55em" height="0.55em" viewBox="0 0 24 24"
      fill={filled ? "#fb7185" : "none"}
      stroke={filled ? "#fb7185" : "rgba(255,255,255,0.25)"}
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function ExplanationBlock({ text, reference, ok }: { text?: string; reference?: string; ok?: boolean }) {
  if (!text && !reference) return null;
  const tint = ok === undefined ? "rgba(255,255,255,0.08)"
              : ok ? COLOR_OK_BG : COLOR_WRONG_BG;
  return (
    <div style={{
      background: tint,
      border: `0.04em solid ${ok === undefined ? "rgba(255,255,255,0.12)" : ok ? COLOR_OK_BORDER : COLOR_WRONG_BORDER}`,
      borderRadius: "0.4em",
      padding: "0.5em 0.7em",
      fontSize: "0.55em",
      color: "rgba(255,255,255,0.86)",
      lineHeight: 1.45,
      textAlign: "center",
    }}>
      {text}
      {reference && (
        <div style={{ marginTop: text ? "0.4em" : 0, fontWeight: 700, opacity: 0.85, letterSpacing: "0.05em" }}>
          — {reference}
        </div>
      )}
    </div>
  );
}

// ── Game-specific bodies ─────────────────────────────────────────────────────

function TriviaBody({ p, accent }: { p: TriviaStagePayload; accent: string }) {
  return (
    <>
      <GameLabel text={`Bible Trivia${p.difficulty ? ` · ${p.difficulty}` : ""}`} accent={accent} />
      {p.questionNum && p.totalNum && <ProgressLine current={p.questionNum} total={p.totalNum} />}
      <CardWrap>
        <div style={{ fontSize: "0.85em", fontWeight: 700, lineHeight: 1.3 }}>
          {p.question}
        </div>
      </CardWrap>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35em" }}>
        {p.options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          let state: "neutral" | "correct" | "wrong" | "dim" = "neutral";
          if (p.revealed) state = i === p.correctIndex ? "correct" : "dim";
          return <OptionRow key={i} letter={letter} text={opt} state={state} />;
        })}
      </div>
      {p.revealed && <ExplanationBlock text={p.explanation} reference={p.reference} ok />}
    </>
  );
}

function WhoSaidItBody({ p, accent }: { p: WhoSaidItStagePayload; accent: string }) {
  return (
    <>
      <GameLabel text="Who Said It?" accent={accent} />
      {p.questionNum && p.totalNum && <ProgressLine current={p.questionNum} total={p.totalNum} />}
      <CardWrap>
        <div style={{
          fontSize: "0.75em", fontStyle: "italic", lineHeight: 1.35,
          textAlign: "center", padding: "0.2em 0.4em",
        }}>
          “{p.quote}”
        </div>
      </CardWrap>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35em" }}>
        {p.options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          let state: "neutral" | "correct" | "wrong" | "dim" = "neutral";
          if (p.revealed) state = i === p.correctIndex ? "correct" : "dim";
          return <OptionRow key={i} letter={letter} text={opt} state={state} />;
        })}
      </div>
      {p.revealed && p.reference && (
        <div style={{ alignSelf: "center", fontSize: "0.36em", color: COLOR_MUTED, letterSpacing: "0.06em" }}>
          — {p.reference}
        </div>
      )}
    </>
  );
}

function TwoTruthsBody({ p, accent }: { p: TwoTruthsStagePayload; accent: string }) {
  return (
    <>
      <GameLabel text="Two Truths and a Lie" accent={accent} />
      {p.round && p.total && <ProgressLine current={p.round} total={p.total} />}
      <CardWrap>
        <div style={{ fontSize: "0.7em", textAlign: "center", fontWeight: 700, letterSpacing: "0.05em" }}>
          {p.subject}
        </div>
        <div style={{ fontSize: "0.42em", textAlign: "center", color: COLOR_MUTED, marginTop: "0.4em" }}>
          {p.revealed ? "Two were true; one was a lie." : "Which one is the lie?"}
        </div>
      </CardWrap>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35em" }}>
        {p.statements.map((s, i) => {
          const letter = String.fromCharCode(65 + i);
          let state: "neutral" | "correct" | "wrong" | "dim" = "neutral";
          if (p.revealed) state = i === p.lieIndex ? "wrong" : "correct";
          return <OptionRow key={i} letter={letter} text={s} state={state} />;
        })}
      </div>
      {p.revealed && <ExplanationBlock text={p.explanation} reference={p.reference} ok={false} />}
    </>
  );
}

function TrueFalseBody({ p, accent }: { p: TrueFalseStagePayload; accent: string }) {
  return (
    <>
      <GameLabel text="True or False?" accent={accent} />
      {p.round && p.total && <ProgressLine current={p.round} total={p.total} />}
      <CardWrap>
        <div style={{ fontSize: "0.78em", lineHeight: 1.35, textAlign: "center", padding: "0.2em 0.4em" }}>
          “{p.statement}”
        </div>
      </CardWrap>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4em" }}>
        {[true, false].map((v) => {
          const isAnswer = p.revealed && v === p.answer;
          const isWrongChoice = p.revealed && v !== p.answer;
          const bg = isAnswer ? COLOR_OK_BG : isWrongChoice ? COLOR_WRONG_BG : COLOR_NEUTRAL_BG;
          const border = isAnswer ? COLOR_OK_BORDER : isWrongChoice ? COLOR_WRONG_BORDER : COLOR_NEUTRAL_BORDER;
          return (
            <div key={String(v)} style={{
              background: bg,
              border: `0.04em solid ${border}`,
              borderRadius: "0.45em",
              padding: "0.7em 0.5em",
              textAlign: "center",
              fontSize: "0.85em",
              fontWeight: 800,
              letterSpacing: "0.06em",
              opacity: isWrongChoice ? 0.55 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4em",
            }}>
              {isAnswer && <CheckMark color={COLOR_OK} />}
              {isWrongChoice && <XMark color={COLOR_WRONG} />}
              {v ? "TRUE" : "FALSE"}
            </div>
          );
        })}
      </div>
      {p.revealed && <ExplanationBlock text={p.explanation} reference={p.reference} ok />}
    </>
  );
}

function CharadesBody({ p, accent }: { p: CharadesStagePayload; accent: string }) {
  return (
    <>
      <GameLabel text="Bible Charades" accent={accent} />
      <div style={{
        background: "rgba(15,15,20,0.55)",
        border: `0.06em dashed ${accent}88`,
        borderRadius: "0.5em",
        padding: "1em 0.8em",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "0.34em", color: accent, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.6em" }}>
          {p.category}
        </div>
        <div style={{ fontSize: "1.25em", fontWeight: 800, lineHeight: 1.15 }}>
          {p.prompt}
        </div>
        {p.hint && (
          <div style={{ fontSize: "0.4em", color: COLOR_MUTED, fontStyle: "italic", marginTop: "0.7em" }}>
            Hint: {p.hint}
          </div>
        )}
      </div>
    </>
  );
}

function HangmanBody({ p, accent }: { p: HangmanStagePayload; accent: string }) {
  const livesArr = Array.from({ length: p.livesMax });
  const livesRemaining = Math.max(0, p.livesMax - p.livesUsed);
  return (
    <>
      <GameLabel text="Bible Hangman" accent={accent} />
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.6em" }}>
        <div style={{ fontSize: "0.32em", color: COLOR_MUTED, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
          {p.category}
        </div>
        <div style={{ display: "flex", gap: "0.15em", alignItems: "center" }} aria-label={`${livesRemaining} lives remaining`}>
          {livesArr.map((_, i) => (
            <HeartIcon key={i} filled={i < livesRemaining} />
          ))}
        </div>
      </div>
      <CardWrap borderColor={p.revealed ? COLOR_OK_BORDER : `${accent}55`}>
        <div style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "0.95em", letterSpacing: "0.32em",
          textAlign: "center", fontWeight: 800,
        }}>
          {p.revealed && p.word ? p.word : p.display}
        </div>
        {p.hint && (
          <div style={{ fontSize: "0.35em", color: COLOR_MUTED, fontStyle: "italic", textAlign: "center", marginTop: "0.5em" }}>
            Hint: {p.hint}
          </div>
        )}
      </CardWrap>
      {p.wrongLetters.length > 0 && (
        <div style={{ alignSelf: "center", fontSize: "0.35em", color: COLOR_MUTED }}>
          Wrong letters: <span style={{ color: "#fb7185", fontWeight: 700, letterSpacing: "0.15em" }}>
            {p.wrongLetters.join(" ")}
          </span>
        </div>
      )}
    </>
  );
}

function EmojiQuizBody({ p, accent }: { p: EmojiQuizStagePayload; accent: string }) {
  const showOptions = p.options.length > 0;
  return (
    <>
      <GameLabel text={`Bible Emoji Quiz · ${p.category}`} accent={accent} />
      {p.round && p.total && <ProgressLine current={p.round} total={p.total} />}
      <CardWrap>
        <div style={{ fontSize: "1.6em", textAlign: "center", lineHeight: 1.1, padding: "0.15em 0" }}>
          {p.emojis}
        </div>
      </CardWrap>
      {showOptions && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35em" }}>
          {p.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            let state: "neutral" | "correct" | "wrong" | "dim" = "neutral";
            if (p.revealed) state = i === p.correctIndex ? "correct" : "dim";
            return <OptionRow key={i} letter={letter} text={opt} state={state} />;
          })}
        </div>
      )}
      {p.hint && !p.revealed && (
        <div style={{ alignSelf: "center", fontSize: "0.4em", color: COLOR_MUTED, fontStyle: "italic" }}>
          Hint: {p.hint}
        </div>
      )}
    </>
  );
}

function VerseScrambleBody({ p, accent }: { p: VerseScrambleStagePayload; accent: string }) {
  return (
    <>
      <GameLabel text={`Verse Scramble · ${p.reference}`} accent={accent} />
      {p.revealed ? (
        <CardWrap borderColor={COLOR_OK_BORDER}>
          <div style={{ fontSize: "0.78em", lineHeight: 1.4, textAlign: "center", fontStyle: "italic" }}>
            “{p.words.join(" ")}”
          </div>
          <div style={{ fontSize: "0.36em", color: COLOR_MUTED, textAlign: "center", marginTop: "0.5em", letterSpacing: "0.05em", fontWeight: 700 }}>
            — {p.reference} (KJV)
          </div>
        </CardWrap>
      ) : (
        <CardWrap>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3em", justifyContent: "center" }}>
            {p.words.map((w, i) => (
              <span key={i} style={{
                background: "rgba(255,255,255,0.08)",
                border: `0.04em solid ${COLOR_NEUTRAL_BORDER}`,
                borderRadius: "0.3em",
                padding: "0.32em 0.55em",
                fontSize: "0.6em",
                fontWeight: 600,
              }}>
                {w}
              </span>
            ))}
          </div>
          {p.hint && (
            <div style={{ fontSize: "0.36em", color: COLOR_MUTED, textAlign: "center", marginTop: "0.6em", fontStyle: "italic" }}>
              Hint: {p.hint}
            </div>
          )}
        </CardWrap>
      )}
    </>
  );
}

function SpellItBody({ p, accent }: { p: SpellItStagePayload; accent: string }) {
  const slots = Array.from({ length: p.wordLength });
  return (
    <>
      <GameLabel text={`Bible Spell-It · ${p.category}`} accent={accent} />
      <CardWrap>
        <div style={{ fontSize: "0.32em", color: COLOR_MUTED, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, textAlign: "center", marginBottom: "0.5em" }}>
          Clue
        </div>
        <div style={{ fontSize: "0.7em", lineHeight: 1.35, textAlign: "center", fontWeight: 600 }}>
          {p.clue}
        </div>
      </CardWrap>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.25em", justifyContent: "center",
        padding: "0.4em 0",
      }}>
        {slots.map((_, i) => {
          const ch = p.revealed && p.word ? p.word[i] : "";
          return (
            <div key={i} style={{
              width: "0.95em", height: "1.15em",
              border: `0.05em solid ${p.revealed ? COLOR_OK_BORDER : `${accent}88`}`,
              background: p.revealed ? COLOR_OK_BG : "rgba(255,255,255,0.04)",
              borderRadius: "0.18em",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "0.85em", fontWeight: 800,
              color: p.revealed ? "#ffffff" : "rgba(255,255,255,0.4)",
            }}>
              {ch || "_"}
            </div>
          );
        })}
      </div>
    </>
  );
}

const CONN_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Easy:   { bg: "rgba(16,185,129,0.18)",  border: "rgba(16,185,129,0.55)",  text: "#6ee7b7" },
  Medium: { bg: "rgba(245,158,11,0.18)",  border: "rgba(245,158,11,0.55)",  text: "#fcd34d" },
  Hard:   { bg: "rgba(56,189,248,0.18)",  border: "rgba(56,189,248,0.55)",  text: "#7dd3fc" },
  Tricky: { bg: "rgba(192,132,252,0.18)", border: "rgba(192,132,252,0.55)", text: "#d8b4fe" },
};

function ConnectionsBody({ p, accent }: { p: ConnectionsStagePayload; accent: string }) {
  const livesArr = Array.from({ length: p.livesMax });
  const livesRemaining = Math.max(0, p.lives);
  const cats = p.revealed ? (p.categories ?? []) : [];

  return (
    <>
      <GameLabel text="Bible Connections" accent={accent} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5em" }}>
        <div style={{ fontSize: "0.6em", fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>
          {p.title}
        </div>
        <div style={{ display: "flex", gap: "0.15em" }}>
          {livesArr.map((_, i) => <HeartIcon key={i} filled={i < livesRemaining} />)}
        </div>
      </div>

      {p.solved.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25em" }}>
          {p.solved.map((cat) => {
            const c = CONN_COLORS[cat.difficulty] ?? { bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.2)", text: "#fff" };
            return (
              <div key={cat.name} style={{
                background: c.bg, border: `0.04em solid ${c.border}`,
                borderRadius: "0.35em", padding: "0.4em 0.7em",
                display: "flex", flexDirection: "column", gap: "0.15em",
              }}>
                <div style={{ fontSize: "0.32em", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: c.text }}>
                  {cat.name}
                </div>
                <div style={{ fontSize: "0.42em", color: "rgba(255,255,255,0.8)" }}>
                  {cat.items.join(" · ")}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {p.revealed && cats.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25em" }}>
          {cats.map((cat) => {
            const c = CONN_COLORS[cat.difficulty] ?? { bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.2)", text: "#fff" };
            return (
              <div key={cat.name} style={{
                background: c.bg, border: `0.04em solid ${c.border}`,
                borderRadius: "0.35em", padding: "0.4em 0.7em",
                display: "flex", flexDirection: "column", gap: "0.15em",
              }}>
                <div style={{ fontSize: "0.32em", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: c.text }}>
                  {cat.name}
                </div>
                <div style={{ fontSize: "0.42em", color: "rgba(255,255,255,0.8)" }}>
                  {cat.items.join(" · ")}
                </div>
              </div>
            );
          })}
        </div>
      ) : p.tiles.length > 0 ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.25em",
        }}>
          {p.tiles.map((tile, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.07)",
              border: `0.04em solid rgba(255,255,255,0.15)`,
              borderRadius: "0.3em",
              padding: "0.45em 0.3em",
              textAlign: "center",
              fontSize: "0.42em",
              fontWeight: 600,
              lineHeight: 1.2,
            }}>
              {tile}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

function FillBlankBody({ p, accent }: { p: FillBlankStagePayload; accent: string }) {
  const verseParts = p.verse.split("___");
  return (
    <>
      <GameLabel text="Fill in the Blank" accent={accent} />
      <CardWrap borderColor={p.revealed ? COLOR_OK_BORDER : undefined}>
        <div style={{ fontSize: "0.72em", lineHeight: 1.5, textAlign: "center", fontStyle: "italic" }}>
          {verseParts.map((part, i) => (
            <span key={i}>
              {part}
              {i < verseParts.length - 1 && (
                <span style={{
                  display: "inline-block",
                  minWidth: "3.5em",
                  borderBottom: `0.08em solid ${p.revealed ? "#4ade80" : accent}`,
                  fontStyle: "normal",
                  fontWeight: 800,
                  color: p.revealed ? "#4ade80" : accent,
                  padding: "0 0.25em",
                  letterSpacing: "0.05em",
                }}>
                  {p.revealed ? p.answer.toUpperCase() : "___"}
                </span>
              )}
            </span>
          ))}
        </div>
        <div style={{ fontSize: "0.36em", color: COLOR_MUTED, textAlign: "center", marginTop: "0.6em", letterSpacing: "0.06em", fontWeight: 700 }}>
          — {p.reference}
        </div>
      </CardWrap>
      {!p.revealed && p.options.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.3em" }}>
          {p.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            return <OptionRow key={i} letter={letter} text={opt} state="neutral" />;
          })}
        </div>
      )}
    </>
  );
}

function OddOneOutBody({ p, accent }: { p: OddOneOutStagePayload; accent: string }) {
  return (
    <>
      <GameLabel text={`Odd One Out · ${p.category}`} accent={accent} />
      <div style={{ fontSize: "0.45em", textAlign: "center", color: COLOR_MUTED, letterSpacing: "0.04em" }}>
        {p.revealed ? "The odd one out:" : "Which one doesn't belong?"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.35em" }}>
        {p.items.map((item, i) => {
          const isOdd = i === p.oddIndex;
          let state: "neutral" | "correct" | "wrong" | "dim" = "neutral";
          if (p.revealed) state = isOdd ? "wrong" : "dim";
          const letter = String.fromCharCode(65 + i);
          return <OptionRow key={i} letter={letter} text={item} state={state} />;
        })}
      </div>
      {p.revealed && (
        <ExplanationBlock
          text={p.connection ? `The other three: ${p.connection}${p.explanation ? `\n\n${p.explanation}` : ""}` : p.explanation}
          ok={false}
        />
      )}
    </>
  );
}
