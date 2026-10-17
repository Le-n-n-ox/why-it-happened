// web/src/charts.tsx - dependency-free SVG charts. Colours arrive as CSS variables.
export interface Series {
  name: string;
  color: string;
  values: number[];
}

export interface Slice {
  label: string;
  value: number;
  color: string;
}

const W = 520;
const H = 260;
const ML = 34;
const MR = 8;
const MT = 14;
const MB = 34;
const PLOT_W = W - ML - MR;
const PLOT_H = H - MT - MB;

/** Round the axis top up to a clean step, with at most about 4 gridlines. */
function scale(max: number): { top: number; ticks: number[] } {
  const m = Math.max(max, 1);
  const raw = m / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const step = Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow);
  const top = Math.ceil(m / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return { top, ticks };
}

export function Legend({ series }: { series: Pick<Series, "name" | "color">[] }) {
  return (
    <ul className="legend legend--inline">
      {series.map((s) => (
        <li key={s.name}>
          <span className="legend__sw" style={{ background: s.color }} />
          {s.name}
        </li>
      ))}
    </ul>
  );
}

function Grid({ ticks, y }: { ticks: number[]; y: (v: number) => number }) {
  return (
    <>
      {ticks.map((t) => (
        <g key={t}>
          <line className="chart__grid" x1={ML} x2={W - MR} y1={y(t)} y2={y(t)} />
          <text className="chart__tick" x={ML - 6} y={y(t)} dy=".32em" textAnchor="end">{t}</text>
        </g>
      ))}
    </>
  );
}

export function GroupedBars({
  categories, series, label,
}: { categories: string[]; series: Series[]; label: string }) {
  if (categories.length === 0) return <p className="empty">No data yet.</p>;
  const max = Math.max(0, ...series.flatMap((s) => s.values));
  const { top, ticks } = scale(max);
  const y = (v: number) => MT + PLOT_H - (v / top) * PLOT_H;
  const groupW = PLOT_W / categories.length;
  const barW = Math.min(30, (groupW * 0.72) / Math.max(series.length, 1));
  const summary = categories
    .map((c, i) => `${c}: ${series.map((s) => `${s.name} ${s.values[i] ?? 0}`).join(", ")}`)
    .join("; ");

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}. ${summary}`}>
      <Grid ticks={ticks} y={y} />
      {categories.map((c, ci) => {
        const gx = ML + ci * groupW + (groupW - barW * series.length) / 2;
        return (
          <g key={c}>
            {series.map((s, si) => {
              const v = s.values[ci] ?? 0;
              const h = (v / top) * PLOT_H;
              const bx = gx + si * barW;
              return (
                <g key={s.name}>
                  <rect className="bar" x={bx} y={MT + PLOT_H - h} width={barW - 2} height={h} rx="3"
                    style={{ fill: s.color }}>
                    <title>{`${s.name}, ${c}: ${v}`}</title>
                  </rect>
                  {v > 0 && (
                    <text className="chart__value" x={bx + (barW - 2) / 2} y={MT + PLOT_H - h - 4}
                      textAnchor="middle">{v}</text>
                  )}
                </g>
              );
            })}
            <text className="chart__label" x={ML + ci * groupW + groupW / 2} y={H - 12} textAnchor="middle">
              {c}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({
  labels, series, label,
}: { labels: string[]; series: Series[]; label: string }) {
  const n = labels.length;
  if (n === 0) return <p className="empty">No data yet.</p>;
  const max = Math.max(0, ...series.flatMap((s) => s.values));
  const { top, ticks } = scale(max);
  const x = (i: number) => (n === 1 ? ML + PLOT_W / 2 : ML + (i * PLOT_W) / (n - 1));
  const y = (v: number) => MT + PLOT_H - (v / top) * PLOT_H;
  const base = MT + PLOT_H;
  const every = Math.ceil(n / 8);
  const summary = series.map((s) => `${s.name}: ${s.values.join(", ")}`).join("; ");

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}. ${summary}`}>
      <Grid ticks={ticks} y={y} />
      {series.map((s) => {
        const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
        const line = `M${pts.join(" L")}`;
        const area = `${line} L${x(n - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z`;
        return (
          <g key={s.name}>
            <path className="area" d={area} style={{ fill: s.color }} />
            <path className="line" d={line} pathLength={1} style={{ stroke: s.color }} />
            {s.values.map((v, i) => (
              <circle key={`${s.name}-${labels[i]}`} className="dot" cx={x(i)} cy={y(v)} r="3"
                style={{ fill: s.color }}>
                <title>{`${s.name}, ${labels[i]}: ${v}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      {labels.map((l, i) =>
        i % every === 0 ? (
          <text key={l} className="chart__label" x={x(i)} y={H - 12} textAnchor="middle">{l}</text>
        ) : null,
      )}
    </svg>
  );
}

export function Donut({
  slices, centerLabel, label,
}: { slices: Slice[]; centerLabel: string; label: string }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  let cumulative = 0;
  const summary = slices.map((s) => `${s.label} ${s.value}`).join(", ");

  return (
    <div className="donut">
      <svg className="donut__svg" viewBox="0 0 42 42" role="img"
        aria-label={`${label}. ${summary || "No data"}`}>
        <circle className="donut__track" cx="21" cy="21" r="15.9" />
        <g transform="rotate(-90 21 21)">
          {total > 0 && slices.map((s) => {
            const pct = (s.value / total) * 100;
            const offset = -cumulative;
            cumulative += pct;
            return (
              <circle key={s.label} className="donut__slice" cx="21" cy="21" r="15.9" pathLength={100}
                strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={offset} style={{ stroke: s.color }}>
                <title>{`${s.label}: ${s.value}`}</title>
              </circle>
            );
          })}
        </g>
        <text className="donut__total" x="21" y="22" textAnchor="middle">{total}</text>
        <text className="donut__caption" x="21" y="27" textAnchor="middle">{centerLabel}</text>
      </svg>
      <ul className="legend">
        {slices.map((s) => (
          <li key={s.label}>
            <span className="legend__sw" style={{ background: s.color }} />
            <span className="legend__name">{s.label}</span>
            <strong>{s.value}</strong>
            <span className="legend__pct">{total ? Math.round((s.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}