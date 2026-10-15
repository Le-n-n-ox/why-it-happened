// web/src/pages/InsightPage.tsx - one insight in full: big pitch, every language, facts, evidence.
import {
  evidenceEvents, formatMinute, kindLabel, languageName, stripCitations, teamColor,
} from "../match";
import { useMatch } from "../matchContext";
import { Pitch } from "../Pitch";

export function InsightPage({ id }: { id: string }) {
  const { insights, byId, allEvents, teams, status } = useMatch();
  const insight = insights.find((i) => i.id === id);

  if (!insight) {
    const waiting = status === "connecting" || status === "live";
    return (
      <section className="page">
        <a className="link" href="#/">← Back to live</a>
        <p className="empty">
          {waiting
            ? "Waiting for this insight..."
            : "Insight not found. Press Replay to rebuild the list."}
        </p>
      </section>
    );
  }

  const evidence = evidenceEvents(insight, byId);
  const skipped = insight.evidence.length - evidence.length;
  const color = teamColor(insight.team, teams);

  return (
    <section className="page">
      <a className="link" href="#/">← Back to live</a>
      <h2>
        <span className="card__minute">{formatMinute(insight.minute)}</span>{" "}
        <span style={{ color }}>{insight.team}</span> · {kindLabel(insight.kind)}
      </h2>

      <Pitch events={allEvents} selected={evidence} teams={teams} />

      <h3>Narration</h3>
      <ul className="plain">
        {Object.entries(insight.narration).map(([code, text]) => (
          <li key={code}>
            <strong>{languageName(code)}: </strong>
            <span lang={code}>{stripCitations(text)}</span>
          </li>
        ))}
      </ul>

      <h3>Facts</h3>
      <dl className="facts">
        {Object.entries(insight.facts).map(([k, v]) => (
          <div key={k}>
            <dt>{k.replace(/_/g, " ")}</dt>
            <dd>{String(v)}</dd>
          </div>
        ))}
      </dl>

      <h3>Evidence</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Id</th><th>Team</th><th>Type</th><th>Minute</th><th>x</th><th>y</th><th>Outcome</th></tr>
          </thead>
          <tbody>
            {evidence.map((e, n) => (
              <tr key={e.id}>
                <td>{n + 1}</td><td>{e.id}</td><td>{e.team}</td><td>{e.type}</td>
                <td>{formatMinute(e.minute)}</td><td>{e.x}</td><td>{e.y}</td><td>{e.outcome ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {skipped > 0 && <p className="empty">{skipped} cited event(s) were not found in /events.</p>}
    </section>
  );
}