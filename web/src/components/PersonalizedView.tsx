// web/src/components/PersonalizedView.tsx - the rules-only brief for one profile, shared by Fans and Announcers.
import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getBrief, getOverlay, profileQuery } from "@/lib/api";
import { formatMinute, kindLabel, teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";
import type { AudienceBrief, AudienceMode, BriefMetric } from "@/types/types";

function MetricCard({ metric, teams }: { metric: BriefMetric; teams: string[] }) {
  return (
    <div className="grid gap-2 rounded-card border border-line bg-surface-2 px-3.5 py-3">
      <p className="m-0 text-[.75rem] font-semibold uppercase text-muted">Your metric · {metric.label}</p>
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
        {metric.values.map((row) => (
          <span key={row.team} className="font-heading text-[1.5rem] font-bold tabular-nums">
            <span style={{ color: teamColor(row.team, teams) }}>{row.value ?? "–"}{metric.unit}</span>
            <span className="ml-1.5 text-[.8rem] font-normal text-muted">{row.team}</span>
          </span>
        ))}
        {metric.player && (
          <span className="font-heading text-[1.5rem] font-bold tabular-nums">
            {metric.player.value}{metric.unit}
            <span className="ml-1.5 text-[.8rem] font-normal text-muted">{metric.player.name}</span>
          </span>
        )}
      </div>
      <p className={ui.empty}>{metric.note}</p>
    </div>
  );
}

function MomentList({ brief, teams }: { brief: AudienceBrief; teams: string[] }) {
  const moments = brief.moments ?? [];
  if (moments.length === 0) return <p className={ui.empty}>No moments yet; the match is still building.</p>;
  return (
    <ul className="grid gap-2">
      {moments.map((moment, index) => (
        <li
          key={`${moment.minute}-${moment.kind}-${index}`}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card border border-l-4 border-line bg-surface px-3.5 py-2.5"
          style={{ borderLeftColor: teamColor(moment.team ?? "", teams) }}
        >
          <span className="min-w-[3.2ch] font-heading text-[1.35rem] font-bold text-accent tabular-nums">
            {formatMinute(moment.minute)}
          </span>
          {moment.team && <span className="font-bold" style={{ color: teamColor(moment.team, teams) }}>{moment.team}</span>}
          <span className="text-[.8rem] uppercase text-muted">{kindLabel(moment.kind)}</span>
          <span className="w-full">{moment.what}</span>
        </li>
      ))}
    </ul>
  );
}

function FanView({ brief, teams, showMoments = true }: { brief: AudienceBrief; teams: string[]; showMoments?: boolean }) {
  return (
    <>
      <div className="grid gap-1">
        <p className="m-0 font-heading text-[1.7rem] font-bold">{brief.headline}</p>
        <p className={ui.meta}>
          {brief.your_club
            ? <span style={{ color: teamColor(brief.your_club, teams) }}>{brief.your_club}</span>
            : <span>Both teams</span>}
          <span>· {brief.mood}</span>
        </p>
      </div>
      {brief.player_spotlight && (
        <div className={ui.panel}>
          <p className="m-0 font-semibold">
            {brief.player_spotlight.name}
            <span className="ml-2 text-muted">{brief.player_spotlight.team}</span>
          </p>
          <p className="m-0">{brief.player_spotlight.line}</p>
        </div>
      )}
      {showMoments && <MomentList brief={brief} teams={teams} />}
    </>
  );
}

function AnalystView({ brief, teams }: { brief: AudienceBrief; teams: string[] }) {
  const stats = brief.team_stats ?? {};
  const columns = ["goals", "shots", "xg", "final_third_entries", "entries_with_shot", "possession_pct"];
  return (
    <>
      <p className="m-0 font-heading text-[1.7rem] font-bold">{brief.headline}</p>
      {brief.chance_quality && <p className={ui.empty}>{brief.chance_quality.summary}</p>}
      <ul className="grid gap-2">
        {(brief.factors ?? []).map((factor) => (
          <li key={factor.code} className="grid gap-1 rounded-card border border-line bg-surface px-3.5 py-2.5">
            <p className={`m-0 ${ui.meta}`}>
              <span className="font-bold">{factor.title}</span>
              <span style={{ color: teamColor(factor.favours, teams) }}>{factor.favours}</span>
            </p>
            <p className="m-0">{factor.detail}</p>
          </li>
        ))}
      </ul>
      {Object.keys(stats).length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={ui.th}>Team</th>
                {columns.map((column) => <th key={column} className={ui.th}>{column.replace(/_/g, " ")}</th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats).map(([team, row]) => (
                <tr key={team}>
                  <td className={ui.td} style={{ color: teamColor(team, teams) }}>{team}</td>
                  {columns.map((column) => <td key={column} className={`${ui.td} tabular-nums`}>{row[column]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(brief.turning_points ?? []).length > 0 && (
        <>
          <h3 className={ui.h3}>Turning points</h3>
          <ul className="grid gap-2">
            {(brief.turning_points ?? []).map((point, index) => (
              <li key={`${point.minute}-${index}`} className="rounded-card border border-line bg-surface px-3.5 py-2.5">
                <span className={ui.minute}>{formatMinute(point.minute)}</span>{" "}
                <span style={{ color: teamColor(point.team, teams) }}>{point.team}</span> · {point.text}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function AnnouncerView({ brief, teams }: { brief: AudienceBrief; teams: string[] }) {
  return (
    <>
      <p className="m-0 font-heading text-[1.7rem] font-bold">{brief.score_line}</p>
      <ul className="grid gap-2">
        {(brief.cues ?? []).map((cue, index) => (
          <li
            key={`${cue.minute}-${index}`}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card border border-l-4 border-line bg-surface px-3.5 py-2.5"
            style={{ borderLeftColor: teamColor(cue.team, teams) }}
          >
            <span className="min-w-[3.2ch] font-heading text-[1.35rem] font-bold text-accent tabular-nums">
              {formatMinute(cue.minute)}
            </span>
            <span className="font-bold" style={{ color: teamColor(cue.team, teams) }}>{cue.team}</span>
            <span className={ui.chip}>{kindLabel(cue.kind)}</span>
            <span className="w-full">{cue.say}</span>
            <span className={ui.chip}>hold {cue.hold_s}s</span>
          </li>
        ))}
      </ul>
      {brief.names && brief.names.length > 0 && (
        <p className={ui.empty}>Names on the sheet: {brief.names.join(", ")}.</p>
      )}
    </>
  );
}

type PlayerRow = {
  name?: string; team?: string; rating?: number; goals?: number; touches?: number;
  key_moments?: number; goals_created?: number; chains_involved?: number;
};

function PlayerView({ brief, teams }: { brief: AudienceBrief; teams: string[] }) {
  const player = brief.player as PlayerRow | null;
  if (!player) return <p className={ui.empty}>No player in this match yet.</p>;
  return (
    <>
      <p className="m-0 font-heading text-[1.7rem] font-bold">
        {player.name}
        <span className="ml-2 text-[1.1rem] text-muted">{player.team}</span>
      </p>
      <div className={`${ui.panel} grid-cols-[repeat(auto-fit,minmax(120px,1fr))]`}>
        {[
          ["Rating", player.rating],
          ["Goals", player.goals],
          ["Touches", player.touches],
          ["Key moments", player.key_moments],
          ["Goals created", player.goals_created],
          ["Moves involved", player.chains_involved],
        ].map(([label, value]) => (
          <div key={String(label)} className="grid gap-0.5">
            <span className="text-[.72rem] font-semibold uppercase text-muted">{label}</span>
            <span className="font-heading text-[1.35rem] font-bold tabular-nums">{value ?? "–"}</span>
          </div>
        ))}
      </div>
      <MomentList brief={brief} teams={teams} />
    </>
  );
}

function OverlayTimeline({ query }: { query: string }) {
  const { data, loading, error } = useApi(getOverlay, query);
  if (loading) return <Loader label="Timing the overlay cards" />;
  if (error !== null) return <p className={ui.empty}>The overlay feed is unavailable ({error}).</p>;
  if (!data) return null;
  return (
    <section className={ui.panel} aria-label="Overlay timeline">
      <h3 className={ui.h3}>Overlay timeline</h3>
      <p className={ui.empty}>
        {data.cards.length} timed cards · {data.timing.unit} · {data.timing.note}
      </p>
      <ol className="grid gap-1.5">
        {data.cards.map((card) => (
          <li key={card.id} className="grid grid-cols-[5.5ch_minmax(0,1fr)_auto] items-baseline gap-2 text-sm">
            <span className="font-bold tabular-nums text-accent">{formatMinute(card.at)}</span>
            <span>
              <span className="font-semibold">{card.headline}</span>
              <span className="text-muted"> · {card.text}</span>
            </span>
            <span className={ui.chip}>hold {card.hold_s}s</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The rules-only brief for one profile, rendered in place. Fans and Announcers pass the mode they
 * want; the shared profile supplies the clubs, player and metric.
 */
export function PersonalizedBrief({
  mode,
  compactFan = false,
  title = "Your view",
  overlay = true,
}: {
  mode?: AudienceMode;
  compactFan?: boolean;
  title?: string;
  overlay?: boolean;
}) {
  const { profile, lang, teams } = useMatch();
  const chosen = mode ?? profile.mode;
  const query = profileQuery({ ...profile, mode: chosen }, lang);
  const { data, loading, error, retry } = useApi(getBrief, query);

  return (
    <section className="grid gap-3" aria-label={title}>
      <h3 className={ui.h3}>{title}</h3>
      {data && data.profile.notes.length > 0 && (
        <p className={ui.empty}>{data.profile.notes.join(" ")}</p>
      )}
      {loading && <Loader label={`Building the ${chosen} view`} />}
      {error !== null && (
        <p role="alert" className={ui.banner}>
          Couldn't build this view ({error}). <Button className={ui.bannerButton} onClick={retry}>Retry</Button>
        </p>
      )}
      {data && (
        <>
          {data.metric && <MetricCard metric={data.metric} teams={teams} />}
          {data.brief.mode === "fan" && <FanView brief={data.brief} teams={teams} showMoments={!compactFan} />}
          {data.brief.mode === "analyst" && <AnalystView brief={data.brief} teams={teams} />}
          {data.brief.mode === "announcer" && <AnnouncerView brief={data.brief} teams={teams} />}
          {data.brief.mode === "player" && <PlayerView brief={data.brief} teams={teams} />}
          <p className={ui.empty}>{data.note}</p>
        </>
      )}
      {overlay && <OverlayTimeline query={query} />}
    </section>
  );
}
