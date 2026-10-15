// web/src/pages/FansPage.tsx - fan view: pick a team, follow its moments, share them.
import { useState } from "react";
import { ShareButton } from "../Actions";
import {
  formatMinute, kindLabel, lacksLang, pickText, stripCitations, teamColor,
} from "../match";
import { useMatch } from "../matchContext";

function initialFav(): string {
  try {
    return localStorage.getItem("fav") ?? "all";
  } catch {
    return "all"; // storage can be blocked
  }
}

function shareUrl(id: string): string {
  return `${window.location.origin}${window.location.pathname}#/insight/${encodeURIComponent(id)}`;
}

export function FansPage() {
  const { insights, teams, shown, score, lang, ended } = useMatch();
  const [fav, setFav] = useState(initialFav);
  const [cheered, setCheered] = useState<Set<string>>(new Set());

  const active = teams.includes(fav) ? fav : "all";
  const list = active === "all" ? insights : insights.filter((i) => i.team === active);
  const goals = shown.filter((e) => e.type === "goal");

  const chooseFav = (team: string) => {
    setFav(team);
    try { localStorage.setItem("fav", team); } catch { /* storage blocked: ignore */ }
  };

  const toggleCheer = (id: string) =>
    setCheered((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="page">
      <h2>Fans</h2>
      <p>Pick your team and see the moments that explain the match, with the proof one tap away.</p>

      <div className="fav" role="group" aria-label="Favourite team">
        <button type="button" aria-pressed={active === "all"} onClick={() => chooseFav("all")}>
          Both teams
        </button>
        {teams.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={active === t}
            onClick={() => chooseFav(t)}
            style={{ borderColor: teamColor(t, teams) }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="story">
        <p className="story__score">
          {teams.map((t) => `${t} ${score[t]}`).join(" - ")}
          {ended && " · Full time"}
        </p>
        {goals.length > 0 ? (
          <ul className="plain">
            {goals.map((g) => (
              <li key={g.id}>
                <span className="card__minute">{formatMinute(g.minute)}</span>{" "}
                <span style={{ color: teamColor(g.team, teams) }}>{g.team}</span> goal
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No goals yet.</p>
        )}
      </div>

      <h3>{active === "all" ? "Key moments" : `${active} moments`}</h3>

      {list.length === 0 ? (
        <p className="empty">
          {insights.length === 0
            ? "Waiting for the first moment..."
            : `No moments for ${active} yet.`}
        </p>
      ) : (
        <ul className="fancards">
          {list.map((i) => {
            const text = stripCitations(pickText(i, lang));
            const cheer = cheered.has(i.id);
            return (
              <li key={i.id} className="fancard" style={{ borderLeftColor: teamColor(i.team, teams) }}>
                <div className="fancard__minute">{formatMinute(i.minute)}</div>
                <div className="fancard__body">
                  <p className="card__meta">
                    <span className="card__team" style={{ color: teamColor(i.team, teams) }}>{i.team}</span>
                    <span className="card__kind">{kindLabel(i.kind)}</span>
                  </p>
                  <p className="fancard__text" lang={lacksLang(i, lang) ? "en" : lang}>
                    {text}
                    {lacksLang(i, lang) && <span className="tag">EN</span>}
                  </p>
                  <div className="cue__actions">
                    <a className="link" href={`#/insight/${encodeURIComponent(i.id)}`}>
                      See it on the pitch →
                    </a>
                    <ShareButton
                      text={`${formatMinute(i.minute)} ${i.team}: ${text} #WhyItHappened`}
                      url={shareUrl(i.id)}
                    />
                    <button type="button" aria-pressed={cheer} onClick={() => toggleCheer(i.id)}>
                      {cheer ? "Cheered" : "Cheer"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="empty">Cheers are just for you. They are not saved or sent anywhere.</p>
    </section>
  );
}