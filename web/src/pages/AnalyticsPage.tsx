// web/src/pages/AnalyticsPage.tsx - live stats and charts, computed from the events seen so far.
import { AnimatedNumber } from "../AnimatedNumber";
import {
  activityBuckets, attackSummary, attackZones, averageAdvance, ballTravel, CHANNEL_NAMES,
  countByType, countType, insightsByKind, playerStats, teamEventCounts,
} from "../analytics";
import { Donut, GroupedBars, Legend, LineChart, type Series } from "../charts";
import { kindLabel, teamColor } from "../match";
import { useMatch } from "../matchContext";
import { Pitch } from "../Pitch";

const PALETTE = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

interface StatProps {
  title: string;
  teams: string[];
  colors: string[];
  values: number[];
}

function StatCard({ title, teams, colors, values }: StatProps) {
  return (
    <div className="stat">
      <h3 className="stat__title">{title}</h3>
      {teams.map((t, i) => (
        <div key={t} className="stat__row">
          <span style={{ color: colors[i] }}>{t}</span>
          <span className="stat__num"><AnimatedNumber value={values[i]} /></span>
        </div>
      ))}
    </div>
  );
}

function MeterCell({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="cell-meter">
      <span className="cell-meter__num">{value}</span>
      <div className="meter" aria-hidden="true">
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { shown, teams, insights } = useMatch();

  if (teams.length === 0) {
    return (
      <section className="page">
        <h2>Analytics</h2>
        <p className="empty">Waiting for match data...</p>
      </section>
    );
  }

  const colors = teams.map((t) => teamColor(t, teams));
  const toSeries = (rows: number[][]): Series[] =>
    teams.map((t, i) => ({ name: t, color: colors[i], values: rows[i] }));

  const byType = countByType(shown, teams);
  const buckets = activityBuckets(shown, teams);
  const eventCounts = teamEventCounts(shown, teams);
  const advance = averageAdvance(shown, teams);
  const kinds = insightsByKind(insights);
  const insightCounts = teams.map((t) => insights.filter((i) => i.team === t).length);
  const travel = ballTravel(shown, teams);

  const cells = attackZones(shown, teams);
  const { rows: attackRows, leader } = attackSummary(cells, teams);
  const noAttacks = attackRows.every((r) => r.total === 0);

  const players = playerStats(shown);
  const maxScore = Math.max(1, ...players.map((p) => p.score));
  const maxDistance = Math.max(1, ...players.map((p) => p.distanceM));

  return (
    <section className="page page--wide">
      <h2>Analytics</h2>
      <p className="empty">Computed from {shown.length} events so far. Updates as the match plays.</p>

      <div className="stats">
        <StatCard title="Goals" teams={teams} colors={colors} values={countType(shown, teams, "goal")} />
        <StatCard title="Shots" teams={teams} colors={colors} values={countType(shown, teams, "shot")} />
        <StatCard title="Passes" teams={teams} colors={colors} values={countType(shown, teams, "pass")} />
        <StatCard title="Insights found" teams={teams} colors={colors} values={insightCounts} />
        <StatCard title="Ball travel (m, est.)" teams={teams} colors={colors} values={travel} />
      </div>

      <section className="panel" aria-label="Where each team attacks">
        <h3>Where each team attacks</h3>
        <p className="empty">
          Passes, carries and shots in each team's final third, split into the top, centre and bottom of the
          pitch map. Darker means more.
        </p>
        <Pitch events={shown} selected={[]} teams={teams} zones={cells} />
        <ul className="attack-list">
          {attackRows.map((r, i) => (
            <li key={r.team}>
              <strong style={{ color: colors[i] }}>{r.team}</strong>: {r.total} final-third actions
              {r.total > 0 && `, most through the ${CHANNEL_NAMES[r.bestChannel]} of the pitch (${r.bestCount})`}
            </li>
          ))}
        </ul>
        <p className="attack-leader">
          {noAttacks
            ? "No attacking actions in the final third yet."
            : leader
              ? `${leader} attack the most.`
              : "Both teams have attacked equally so far."}
        </p>
      </section>

      <section className="panel" aria-label="Player ranking">
        <h3>Player ranking</h3>
        {players.length === 0 ? (
          <p className="empty">
            This match data has no player names yet, so player impact and distance can't be worked out. They
            appear automatically once events carry a player.
          </p>
        ) : (
          <>
            <p className="empty">
              Impact score is computed from the actions in the data (goals and shots count most, fouls count
              against). It is not an official rating. Distance is estimated from the locations of a
              player's consecutive events, so it is a minimum and not tracking data.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Player</th><th>Team</th><th>Actions</th><th>Goals</th><th>Shots</th>
                    <th>Impact</th><th>Est. distance (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, n) => {
                    const color = teamColor(p.team, teams);
                    return (
                      <tr key={`${p.team}-${p.player}`}>
                        <td>{n + 1}</td>
                        <td>{p.player}</td>
                        <td style={{ color }}>{p.team}</td>
                        <td>{p.actions}</td>
                        <td>{p.goals}</td>
                        <td>{p.shots}</td>
                        <td><MeterCell value={p.score} max={maxScore} color={color} /></td>
                        <td><MeterCell value={p.distanceM} max={maxDistance} color={color} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <div className="charts">
        <section className="panel" aria-label="Events by type">
          <h3>Events by type</h3>
          <Legend series={toSeries(byType.counts)} />
          <GroupedBars
            label="Events by type"
            categories={byType.types.map(cap)}
            series={toSeries(byType.counts)}
          />
        </section>

        <section className="panel" aria-label="Activity over time">
          <h3>Activity per 5 minutes</h3>
          <Legend series={toSeries(buckets.counts)} />
          <LineChart label="Events per 5-minute window" labels={buckets.labels} series={toSeries(buckets.counts)} />
        </section>

        <section className="panel" aria-label="Share of events">
          <h3>Share of recorded events</h3>
          <Donut
            label="Share of recorded events"
            centerLabel="events"
            slices={teams.map((t, i) => ({ label: t, value: eventCounts[i], color: colors[i] }))}
          />
        </section>

        <section className="panel" aria-label="Insights by type">
          <h3>Insights by type</h3>
          {kinds.length === 0 ? (
            <p className="empty">No insights yet.</p>
          ) : (
            <Donut
              label="Insights by type"
              centerLabel="insights"
              slices={kinds.map((k, i) => ({
                label: kindLabel(k.kind),
                value: k.count,
                color: PALETTE[i % PALETTE.length],
              }))}
            />
          )}
        </section>

        <section className="panel panel--span" aria-label="Territory">
          <h3>Average advancement</h3>
          <p className="empty">0 is a team's own goal line, 100 is the opponent's.</p>
          {teams.map((t, i) => (
            <div key={t} className="meter-row">
              <span className="meter-row__name" style={{ color: colors[i] }}>{t}</span>
              <div className="meter" role="img" aria-label={`${t} average advancement ${advance[i]} of 100`}>
                <span style={{ width: `${advance[i]}%`, background: colors[i] }} />
              </div>
              <span className="meter-row__val">{advance[i]}</span>
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}