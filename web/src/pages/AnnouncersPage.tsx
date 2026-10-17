// web/src/pages/AnnouncersPage.tsx - booth view: the line to read, a cue sheet, and proof to fact-check.
import { useState } from "react";
import { CopyButton } from "@/components/Actions";
import {
  factChips, formatMinute, kindLabel, lacksLang, pickText, stripCitations, teamColor,
} from "@/lib/match";
import { useMatch } from "@/types/matchContext";
import type { Insight } from "@/types/types";

type Size = "m" | "l" | "xl";
const SIZES: { id: Size; label: string }[] = [
  { id: "m", label: "A" },
  { id: "l", label: "A+" },
  { id: "xl", label: "A++" },
];

export function AnnouncersPage() {
  const { insights, teams, score, clock, ended, lang, selectedId, select } = useMatch();
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
    <section className="page">
      <h2>Announcers</h2>

      <div className="onair" aria-label="On air">
        <div className="onair__bar">
          <span className="onair__status">
            {teams.map((t) => `${t} ${score[t]}`).join(" - ")} · {ended ? "FT" : formatMinute(clock)}
          </span>
          <span className="onair__sizes" role="group" aria-label="Text size">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={size === s.id}
                onClick={() => setSize(s.id)}
              >
                {s.label}
              </button>
            ))}
          </span>
        </div>

        {current ? (
          <>
            <p className="onair__meta">
              <span className="card__minute">{formatMinute(current.minute)}</span>{" "}
              <span style={{ color: teamColor(current.team, teams) }}>{current.team}</span>
              {" · "}{kindLabel(current.kind)}
            </p>
            <p className="onair__text" data-size={size} lang={lacksLang(current, lang) ? "en" : lang}>
              {stripCitations(pickText(current, lang))}
            </p>
            <p className="onair__proof">
              Check: {current.evidence.join(", ")}{" "}
              <a className="link" href={`#/insight/${encodeURIComponent(current.id)}`}>
                Open the proof →
              </a>
            </p>
          </>
        ) : (
          <p className="empty">Waiting for the first insight...</p>
        )}
      </div>

      <div className="cues__head">
        <h3>Cue sheet</h3>
        <button type="button" onClick={() => setRead(new Set())} disabled={read.size === 0}>
          Clear read marks
        </button>
      </div>
      <p className="empty">Newest first. Read marks stay in this page only.</p>

      <ul className="cues">
        {insights.map((i) => {
          const isCurrent = i.id === current?.id;
          return (
            <li
              key={i.id}
              className="cue"
              data-read={read.has(i.id)}
              style={{ borderLeftColor: teamColor(i.team, teams) }}
            >
              <div className="card__meta">
                <span className="card__minute">{formatMinute(i.minute)}</span>
                <span className="card__team" style={{ color: teamColor(i.team, teams) }}>{i.team}</span>
                <span className="card__kind">{kindLabel(i.kind)}</span>
              </div>
              <p className="cue__text" lang={lacksLang(i, lang) ? "en" : lang}>
                {stripCitations(pickText(i, lang))}
                {lacksLang(i, lang) && <span className="tag">EN</span>}
              </p>
              <div className="card__chips">
                {factChips(i).map((c) => <span key={c} className="chip">{c}</span>)}
                <span className="chip">Check: {i.evidence.join(", ")}</span>
              </div>
              <div className="cue__actions">
                <button type="button" aria-pressed={isCurrent} onClick={() => select(i.id)}>
                  {isCurrent ? "On air" : "Put on air"}
                </button>
                <CopyButton text={line(i)} label="Copy line" />
                <label className="cue__read">
                  <input type="checkbox" checked={read.has(i.id)} onChange={() => toggleRead(i.id)} />
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