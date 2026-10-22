// web/src/pages/AskPage.tsx - ask the match a question, and see which facts answered it.
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/Button";
import { EvidenceChips } from "@/components/EvidenceChips";
import { Loader } from "@/components/Loader";
import { useAsk, type AskMode } from "@/hooks/useAsk";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";
import type { AskResponse, AskStep } from "@/types/types";

const MAX = 300;

/** The analyses the router can pick, named as the catalogue names them. */
const ANALYSES: Record<string, string> = {
  match_summary: "Why the match ended as it did",
  team_tactics: "The tactics a team used",
  second_half_change: "Whether a team changed after half-time",
  team_assessment: "How well a team played",
  win_probability: "Who is likely to win",
  best_passes: "The passes that created the most",
  fouls: "The fouls and what followed",
  player: "What one player did",
};

const EXAMPLES = [
  "Why did the match end as it did?",
  "How did the teams play in the second half?",
  "How well did each team play?",
  "Which passes created the most?",
  "Which fouls mattered?",
  "Who is likely to win?",
];

const MODES: { id: AskMode; label: string; note: string }[] = [
  {
    id: "auto",
    label: "Auto",
    note: "The model writes the answer from the facts, when a model is configured.",
  },
  {
    id: "rules",
    label: "Rules only",
    note: "The facts are joined by the rules. No model is used, so it always works.",
  },
];

function Badge({ children, tone = "quiet" }: { children: string; tone?: "quiet" | "accent" | "warn" }) {
  const toneClass =
    tone === "accent" ? "bg-accent text-accent-ink" : tone === "warn" ? "bg-warn text-black" : "bg-surface-2 text-muted";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[.72rem] font-semibold ${toneClass}`}>{children}</span>
  );
}

/** "team_tactics, AFC Bournemouth" - the analysis and who it was about. */
function stepLabel(step: AskStep): string {
  const name = ANALYSES[step.name] ?? step.name.replace(/_/g, " ");
  const who = step.team ?? step.player;
  return who ? `${name} (${who})` : name;
}

function Facts({ data }: { data: AskResponse }) {
  if (data.facts.length === 0) return null;
  return (
    <section className="grid gap-2" aria-label="The facts behind the answer">
      <h3 className={ui.h3}>What the answer is built from</h3>
      <ul className="grid gap-2.5">
        {data.facts.map((f, i) => (
          <li key={`${i}-${f.evidence.join()}`} className="grid gap-1.5 rounded-card border border-line bg-surface px-3.5 py-3">
            <p className="m-0 leading-snug">{f.text}</p>
            <EvidenceChips ids={f.evidence} highlight={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AskPage() {
  const { lang } = useMatch();
  const { answer, compare, loading, comparing, error, compareError, ask, compareWithRules, reset } = useAsk();
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<AskMode>("auto");
  const [asked, setAsked] = useState("");
  const [previous, setPrevious] = useState<string | undefined>();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = question.trim();
    if (q === "" || loading) return;
    // The last question rides along, so a follow-up like "and in the second half?" can lean on it.
    void ask(q, lang, mode, asked || undefined);
    setPrevious(asked || undefined);
    setAsked(q);
  };

  // Ctrl+Enter sends, so a long question does not need the mouse.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const fillExample = (text: string) => {
    setQuestion(text);
    document.getElementById("ask-question")?.focus();
  };

  const canCompare = answer !== null && answer.mode === "model" && compare === null;

  return (
    <section className={ui.page}>
      <h2 className={ui.h2}>Ask the match</h2>
      <p>
        Every answer is built from the match facts, and every fact cites the events behind it. Ask
        something the data cannot answer and it will say so.
      </p>

      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="ask-question" className="text-sm font-semibold">
            Your question
          </label>
          <textarea
            id="ask-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MAX}
            rows={3}
            aria-describedby="ask-count"
            placeholder="Why did the match end as it did?"
            className="w-full resize-y rounded-card border border-line bg-surface px-3.5 py-2.5 leading-snug outline-none focus-visible:border-accent"
          />
          <p id="ask-count" className="m-0 text-[.8rem] text-muted tabular-nums">
            {question.length}/{MAX} characters
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-semibold">Answer with</span>
          {MODES.map((m) => (
            <Button key={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
              {m.label}
            </Button>
          ))}
          <Button type="submit" disabled={question.trim() === "" || loading}>
            {loading ? "Asking..." : "Ask"}
          </Button>
        </div>
        <p className="m-0 text-[.85rem] text-muted">{MODES.find((m) => m.id === mode)?.note}</p>
      </form>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Example questions">
        {EXAMPLES.map((e) => (
          <Button key={e} className="text-[.85rem]" onClick={() => fillExample(e)}>
            {e}
          </Button>
        ))}
      </div>

      {error !== null && (
        <p role="alert" className={ui.banner}>
          Couldn&apos;t ask that question ({error}).{" "}
          <Button className={ui.bannerButton} onClick={() => void ask(asked, lang, mode, previous)}>
            Retry
          </Button>
        </p>
      )}

      {loading && <Loader label="Asking the match" />}

      {answer !== null && !loading && (
        <div className="grid gap-4">
          <section className="grid gap-2.5 rounded-card border border-line bg-surface px-4 py-4" aria-label="The answer">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={answer.mode === "model" ? "accent" : "quiet"}>
                {answer.mode === "model" ? "Written by the model" : "Joined by the rules"}
              </Badge>
              <Badge>{answer.router === "model" ? "Model router" : "Keyword router"}</Badge>
              {answer.follow_up && <Badge>Follow-up</Badge>}
            </div>

            {answer.follow_up && answer.resolved && answer.resolved !== answer.question && (
              <p className="m-0 text-[.88rem] text-muted">Read as: {answer.resolved}</p>
            )}

            {answer.answerable ? (
              <p className="m-0 text-[1.15rem] leading-snug" lang={lang}>
                {answer.answer}
              </p>
            ) : (
              <>
                <p className="m-0 font-semibold">The match data cannot answer that.</p>
                <p className="m-0 leading-snug text-muted">{answer.answer}</p>
              </>
            )}

            {answer.answerable && (
              <div className="flex flex-wrap items-center gap-2.5">
                {canCompare && (
                  <Button disabled={comparing} onClick={() => void compareWithRules(asked, lang, previous)}>
                    {comparing ? "Comparing..." : "Compare with the rules"}
                  </Button>
                )}
                <Button variant="ghost" onClick={reset}>
                  Clear
                </Button>
              </div>
            )}
          </section>

          {answer.answerable && answer.analyses.length > 0 && (
            <section className="grid gap-1.5" aria-label="The analyses used">
              <h3 className={ui.h3}>The analyses that ran</h3>
              <ul className="grid list-disc gap-1 pl-5">
                {answer.analyses.map((s, i) => (
                  <li key={`${s.name}-${i}`}>{stepLabel(s)}</li>
                ))}
              </ul>
            </section>
          )}

          <Facts data={answer} />

          {compareError !== null && (
            <p role="alert" className={ui.banner}>
              Couldn&apos;t load the rules answer ({compareError}).
            </p>
          )}

          {compare !== null && (
            <section className="grid gap-2.5" aria-label="The model answer beside the rules answer">
              <h3 className={ui.h3}>The model answer beside the rules answer</h3>
              <p className="m-0 text-[.9rem] text-muted">
                Both answers come from the same facts. Only the wording differs: the left one is
                written by the model, the right one is joined by the rules.
              </p>
              <div className={ui.split}>
                <div className="grid gap-1.5 rounded-card border border-line bg-surface px-3.5 py-3">
                  <span className="text-[.7rem] font-semibold uppercase text-muted">Model</span>
                  <p className="m-0 leading-snug">{answer.answer}</p>
                </div>
                <div className="grid gap-1.5 rounded-card border border-line bg-surface px-3.5 py-3">
                  <span className="text-[.7rem] font-semibold uppercase text-muted">Rules</span>
                  <p className="m-0 leading-snug">{compare.answer}</p>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
