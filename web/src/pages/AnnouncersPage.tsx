// web/src/pages/AnnouncersPage.tsx - booth view: the line to read, a cue sheet, and proof to fact-check.
import { useState } from "react";
import { CopyButton } from "../components/Actions";
import { Button } from "../components/Button";
import { MatchFlow } from "@/components/MatchFlow";
import {
  factChips, formatMinute, kindLabel, lacksLang, pickText, stripCitations, teamColor,
} from "../lib/match";
import { ui } from "../lib/ui";
import { useMatch } from "../types/matchContext";
import type { Insight } from "../types/types";

type Size = "m" | "l" | "xl";
const SIZES: { id: Size; label: string }[] = [
  { id: "m", label: "A" },
  { id: "l", label: "A+" },
  { id: "xl", label: "A++" },
];
const TEXT_SIZE: Record<Size, string> = { m: "text-[1.3rem]", l: "text-[2rem]", xl: "text-[3rem]" };

/** A booth-specific technical call, built only from the insight's measured facts. */
function technicalCall(i: Insight): string {
  const f = i.facts;
  const seconds = typeof f.duration_s === "number" ? `${f.duration_s}-second` : "quick";
  const passes = typeof f.passes === "number" ? f.passes : null;
  const outcome = typeof f.ended_in === "string" ? f.ended_in.replace(/_/g, " ") : "attacking action";
  switch (i.kind) {
    case "counter_attack":
      return `${i.team} turn a defensive regain into a transition attack: ${passes ?? "Several"} ${passes === 1 ? "pass" : "passes"} carry the move to a ${outcome} in ${seconds}. The key feature is the speed of vertical progression before the opposition can recover its defensive shape.`;
    case "turnover_shot":
      return `${i.team} attack immediately after the turnover, completing the transition to a ${outcome} in ${seconds}. The opposition's defensive transition is exposed before it can re-establish its block.`;
    case "high_press_turnover":
      return `${i.team} win possession high up the pitch and convert the high regain into a ${outcome} in ${seconds}. That is an effective pressing trigger: the short distance to goal lets them attack before the opponent's rest defence is reset.`;
    case "goal_buildup":
      return `${i.team} score at the end of a sustained possession sequence: ${passes ?? "Several"} passes over ${seconds}. The combination gives them controlled progression through the phases and access to the final action.`;
    case "shot_pressure":
      return `${i.team} sustain territorial pressure, registering ${typeof f.shots === "number" ? f.shots : "several"} shots across ${typeof f.span_min === "number" ? f.span_min : "a short spell"} ${f.span_min === 1 ? "minute" : "minutes"}. The repeated entries keep the opposition pinned in its defensive phase.`;
    case "momentum_swing":
      return `${i.team}'s share of possession rises from ${String(f.prev_share_pct ?? "?")}% to ${String(f.curr_share_pct ?? "?")}% over ${String(f.span_min ?? 5)} minutes. That indicates a shift in possession control, though possession share alone does not establish chance quality.`;
    case "foul_turning_point":
      return `${i.team} convert the set-piece phase after winning a foul, scoring ${typeof f.duration_s === "number" ? `${f.duration_s} seconds` : "shortly"} later. The sequence shows how a dead-ball restart can become an attacking platform.`;
    default:
      return stripCitations(pickText(i, "en"));
  }
}

export function AnnouncersPage() {
  const { insights, teams, shown, score, clock, ended, lang, selectedId, select } = useMatch();
  const [size, setSize] = useState<Size>("l");
  const [read, setRead] = useState<Set<string>>(new Set());

  const current = insights.find((i) => i.id === selectedId) ?? insights[0];
  const line = (i: Insight) => `${formatMinute(i.minute)} ${stripCitations(pickText(i, lang))}`;

  const toggleRead = (id: string) =>
    setRead((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className={ui.page}>
      <h2 className={ui.h2}>Announcers</h2>

      <MatchFlow events={shown} teams={teams} technical />

      <div className="grid gap-2.5 rounded-card border-2 border-accent-2 bg-surface px-5 py-4 shadow-card" aria-label="On air">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold tabular-nums">
            {teams.map((t) => `${t} ${score?.[t] ?? 0}`).join(" - ")} · {ended ? "FT" : formatMinute(clock)}
          </span>
          <span className="flex gap-1.5" role="group" aria-label="Text size">
            {SIZES.map((s) => (
              <Button key={s.id} aria-pressed={size === s.id} onClick={() => setSize(s.id)}>
                {s.label}
              </Button>
            ))}
          </span>
        </div>

        {current ? (
          <>
            <p className="m-0 text-muted">
              <span className={ui.minute}>{formatMinute(current.minute)}</span>{" "}
              <span style={{ color: teamColor(current.team, teams) }}>{current.team}</span>
              {" · "}{kindLabel(current.kind)}
            </p>
            <p className={`m-0 font-semibold leading-snug ${TEXT_SIZE[size]}`} lang={lacksLang(current, lang) ? "en" : lang}>
              {lang === "en" ? technicalCall(current) : stripCitations(pickText(current, lang))}
            </p>
            <p className="m-0 text-[.85rem] text-muted">
              Check: {current.evidence.join(", ")}{" "}
              <a className={ui.link} href={`#/insight/${encodeURIComponent(current.id)}`}>
                Open the proof →
              </a>
            </p>
          </>
        ) : (
          <p className={ui.empty}>{shown.length ? "No key moment yet; live play is updating above." : "Waiting for the first insight..."}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className={ui.h3}>Cue sheet</h3>
        <Button onClick={() => setRead(new Set())} disabled={read.size === 0}>
          Clear read marks
        </Button>
      </div>
      <p className={ui.empty}>Newest first. Read marks stay in this page only.</p>

      <ul className="grid gap-2.5">
        {insights.map((i) => {
          const isCurrent = i.id === current?.id;
          return (
            <li
              key={i.id}
              data-read={read.has(i.id)}
              className="grid gap-2 rounded-card border border-l-4 border-line bg-surface px-3.5 py-3 data-[read=true]:opacity-55"
              style={{ borderLeftColor: teamColor(i.team, teams) }}
            >
              <div className={ui.meta}>
                <span className={ui.minute}>{formatMinute(i.minute)}</span>
                <span className="font-bold" style={{ color: teamColor(i.team, teams) }}>{i.team}</span>
                <span>{kindLabel(i.kind)}</span>
              </div>
              <p className="m-0 text-[1.1rem]" lang={lacksLang(i, lang) ? "en" : lang}>
                {lang === "en" ? technicalCall(i) : stripCitations(pickText(i, lang))}
                {lacksLang(i, lang) && <span className={ui.tag}>EN</span>}
              </p>
              <div className={ui.chips}>
                {factChips(i).map((c) => <span key={c} className={ui.chip}>{c}</span>)}
                <span className={ui.chip}>Check: {i.evidence.join(", ")}</span>
              </div>
              <div className={ui.actions}>
                <Button aria-pressed={isCurrent} onClick={() => select(i.id)}>
                  {isCurrent ? "On air" : "Put on air"}
                </Button>
                <CopyButton text={line(i)} label="Copy line" />
                <label className="inline-flex items-center gap-1.5 text-[.9rem] text-muted">
                  <input
                    type="checkbox"
                    className="size-[18px] accent-accent"
                    checked={read.has(i.id)}
                    onChange={() => toggleRead(i.id)}
                  />
                  Read
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
