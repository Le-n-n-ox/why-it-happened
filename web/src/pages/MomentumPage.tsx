// web/src/pages/MomentumPage.tsx - the biggest jumps in the win-probability line, and the claims for them.
import { useCallback, useState } from "react";
import { Badge, ClaimList } from "@/components/claims/ClaimList";
import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getMomentum } from "@/lib/api";
import { formatMinute, teamColor } from "@/lib/match";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

const MODES: { id: "auto" | "sweep"; label: string; note: string }[] = [
  { id: "auto", label: "Model proposals", note: "The model proposes why; the rules count the events and decide." },
  { id: "sweep", label: "Rules sweep", note: "A fixed grid of patterns, tested by the equations alone." },
];

export function MomentumPage() {
  const { teams } = useMatch();
  const [mode, setMode] = useState<"auto" | "sweep">("auto");
  const load = useCallback((m: "auto" | "sweep") => getMomentum(m), []);
  const { data, loading, error, retry } = useApi(load, mode);

  const swings = data?.swings ?? [];

  return (
    <section className={ui.pageWide}>
      <h2 className={ui.h2}>Momentum</h2>
      <p className={`${ui.empty} max-w-prose`}>
        The win-probability line: the score so far plus the quality of each team's chances. A swing is
        a jump in it. The model may propose why the match turned; the rules count the events and decide,
        so a claim the data does not support is shown as not supported.
      </p>

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-sm font-semibold">Claims</span>
        {MODES.map((m) => (
          <Button key={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
          </Button>
        ))}
      </div>

      <p className="m-0 text-[.82rem] text-muted">{MODES.find((m) => m.id === mode)?.note}</p>

      {loading && <Loader label="Reading the win-probability line" />}
      {error !== null && (
        <p role="alert" className={ui.banner}>
          Couldn't read the momentum ({error}). <Button className={ui.bannerButton} onClick={retry}>Retry</Button>
        </p>
      )}

      {data && !loading && (
        <>
          <p className="m-0 rounded-card border border-line bg-surface-2 px-3.5 py-2.5 text-[.88rem] leading-relaxed">
            {data.note}
          </p>

          {swings.length === 0 ? (
            <p className={ui.empty}>No swing big enough to report in this match.</p>
          ) : (
            <ol className="m-0 grid list-none gap-4 p-0">
              {swings.map((swing) => (
                <li
                  key={`${swing.team}-${swing.minute}`}
                  className="grid gap-2.5 rounded-card border border-line bg-surface p-4 transition-colors hover:border-accent/20"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className={ui.minute}>{formatMinute(swing.minute)}</span>
                    <span className="font-bold" style={{ color: teamColor(swing.team, teams) }}>
                      {swing.team}
                    </span>
                    <Badge tone="accent">+{swing.delta} points</Badge>
                    <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[.9rem] font-semibold tabular-nums text-fg">
                      {swing.from}% → {swing.to}%
                    </span>
                    <Badge tone={swing.source === "model" ? "accent" : "quiet"}>
                      {swing.source === "model" ? "The model proposed these claims" : "Rules-only sweep"}
                    </Badge>
                  </div>

                  <p className="m-0 leading-relaxed">{swing.summary}</p>

                  <p className="m-0 rounded-md border-l-2 border-warn/40 bg-warn/5 px-2.5 py-1.5 text-[.85rem] leading-relaxed text-muted">
                    The turn came at {swing.cause.team}'s {swing.cause.type}
                    {swing.cause.player ? ` by ${swing.cause.player}` : ""} at {formatMinute(swing.cause.minute)}.
                  </p>

                  {swing.alpha !== null && (
                    <p className="m-0 text-[.82rem] text-muted">
                      The bar is {swing.alpha} after correcting for {swing.hypotheses.length} claim
                      {swing.hypotheses.length === 1 ? "" : "s"} tested.
                    </p>
                  )}

                  {swing.hypotheses.length === 0 ? (
                    <p className={ui.empty}>
                      {swing.source === "model"
                        ? "The model proposed no claim about this swing that could be tested."
                        : "The sweep tested a fixed grid of patterns and none of them was supported. That is the equations-only baseline, so it is a floor, not a verdict on the swing."}
                    </p>
                  ) : (
                    <ClaimList claims={swing.hypotheses} teams={teams} />
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}