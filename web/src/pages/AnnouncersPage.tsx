// web/src/pages/AnnouncersPage.tsx - booth view: the line to read, a cue sheet, and proof to fact-check.
import { useState } from "react";
import { CopyButton } from "../components/Actions";
import { Button } from "../components/Button";
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

export function AnnouncersPage() {
  const { insights, teams, score, clock, ended, lang, selectedId, select } = useMatch();
  if (!score) return null;
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
              {stripCitations(pickText(current, lang))}
            </p>
            <p className="m-0 text-[.85rem] text-muted">
              Check: {current.evidence.join(", ")}{" "}
              <a className={ui.link} href={`#/insight/${encodeURIComponent(current.id)}`}>
                Open the proof →
              </a>
            </p>
          </>
        ) : (
          <p className={ui.empty}>Waiting for the first insight...</p>
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
                {stripCitations(pickText(i, lang))}
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