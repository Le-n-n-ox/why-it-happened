// web/src/pages/FansPage.tsx - fan view: pick a team, follow its moments, share them.
import { useState } from "react";
import { ShareButton } from "@/components/Actions";
import { Button } from "@/components/Button";
import { MatchFlow } from "@/components/MatchFlow";
import { PersonalizedBrief } from "@/components/PersonalizedView";
import { ProfileBar } from "@/components/ProfileBar";
import { ScoreLine } from "@/components/ScoreLine";
import { useApi } from "@/hooks/useApi";
import { getWhy } from "@/lib/api";
import { formatMinute, kindLabel, lacksLang, pickText, stripCitations, teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

const FAV = "border-2 px-4 py-2 aria-pressed:bg-surface-2 aria-pressed:shadow-[0_0_0_2px_var(--accent)]";

const shareUrl = (id: string): string =>
  `${window.location.origin}${window.location.pathname}#/insight/${encodeURIComponent(id)}`;

/** One row per goal, from /why: the browser never counts goals itself. */
function Goals() {
  const { teams } = useMatch();
  const { data, loading } = useApi(getWhy, "now");
  const reasons = data?.result.reasons ?? [];
  if (loading) return <p className={ui.empty}>Loading goals...</p>;
  if (reasons.length === 0) return <p className={ui.empty}>No goals.</p>;
  return (
    <ul className="grid list-disc gap-1.5 pl-5">
      {reasons.map((r, i) => (
        <li key={`${i}-${r.minute}`}>
          <span className={ui.minute}>{formatMinute(r.minute)}</span>{" "}
          <span style={{ color: teamColor(r.team, teams) }}>{r.team}</span> goal
        </li>
      ))}
    </ul>
  );
}

export function FansPage() {
  const { insights, teams, shown, lang, ended, profile, setProfile } = useMatch();
  const [cheered, setCheered] = useState<Set<string>>(new Set());

  const active = profile.clubs;
  const list = profile.clubs.length === 0
    ? insights
    : insights.filter((i) => profile.clubs.includes(i.team));

  const chooseFav = (team: string) => {
    if (team === "all") {
      setProfile({ clubs: [] });
      return;
    }
    const clubs = profile.clubs.includes(team)
      ? profile.clubs.filter((club) => club !== team)
      : [...profile.clubs, team];
    setProfile({ clubs });
  };
  const momentsLabel = active.length === 0
    ? "Key moments"
    : active.length === 1 ? `${active[0]} moments` : `${active.join(" + ")} moments`;

  const toggleCheer = (id: string) =>
    setCheered((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className={ui.page}>
      <h2 className={ui.h2}>Fans</h2>
      <p>Pick your team and see the moments that explain the match, with the proof one tap away.</p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Favourite teams">
        <Button className={FAV} aria-pressed={active.length === 0} onClick={() => chooseFav("all")}>Both teams</Button>
        {teams.map((t) => (
          <Button
            key={t}
            className={FAV}
            aria-pressed={active.includes(t)}
            onClick={() => chooseFav(t)}
            style={{ borderColor: teamColor(t, teams) }}
          >
            {t}
          </Button>
        ))}
      </div>

      <ProfileBar showClubs={false} />
      <PersonalizedBrief compactFan title="Your match" />

      <div className="grid gap-2 rounded-card border border-line bg-surface px-[18px] py-3.5">
        <p className="m-0 font-heading text-[1.6rem] font-bold tabular-nums">
          <ScoreLine />
          {ended && " · Full time"}
        </p>
        {ended ? <Goals /> : <p className={ui.empty}>The goals are listed at full time.</p>}
      </div>

      <MatchFlow events={shown} teams={teams} />

      <h3 className={ui.h3}>{momentsLabel}</h3>

      {list.length === 0 ? (
        <p className={ui.empty}>
          {insights.length === 0
            ? shown.length ? "No key moment yet; follow the live play above." : "Waiting for the first moment..."
            : `No moments for ${active.join(" + ")} yet.`}
        </p>
      ) : (
        <ul className="grid gap-3">
          {list.map((i) => {
            const text = stripCitations(pickText(i, lang));
            const cheer = cheered.has(i.id);
            return (
              <li
                key={i.id}
                className="flex gap-3.5 rounded-card border border-l-4 border-line bg-surface px-4 py-3.5"
                style={{ borderLeftColor: teamColor(i.team, teams) }}
              >
                <div className="min-w-[3.2ch] font-heading text-[2rem] font-bold text-accent tabular-nums">
                  {formatMinute(i.minute)}
                </div>
                <div className="grid min-w-0 gap-2">
                  <p className={`m-0 ${ui.meta}`}>
                    <span className="font-bold" style={{ color: teamColor(i.team, teams) }}>{i.team}</span>
                    <span>{kindLabel(i.kind)}</span>
                  </p>
                  <p className="m-0 text-[1.15rem] leading-snug" lang={lacksLang(i, lang) ? "en" : lang}>
                    {text}
                    {lacksLang(i, lang) && <span className={ui.tag}>EN</span>}
                  </p>
                  <div className={ui.actions}>
                    <a className={ui.link} href={`#/insight/${encodeURIComponent(i.id)}`}>See it on the pitch →</a>
                    <ShareButton text={`${formatMinute(i.minute)} ${i.team}: ${text} #WhyItHappened`} url={shareUrl(i.id)} />
                    <Button aria-pressed={cheer} onClick={() => toggleCheer(i.id)}>
                      {cheer ? "Cheered" : "Cheer"}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className={ui.empty}>Cheers are just for you. They are not saved or sent anywhere.</p>
    </section>
  );
}
