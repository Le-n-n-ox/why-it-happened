// web/src/lib/hypotheses.ts - words for a tested claim. The numbers themselves come from the API.
import type { ClaimWhere, HypothesisClaim } from "@/types/types";

const TYPE_NOUNS: Record<string, string> = {
  pass: "passes",
  carry: "carries",
  shot: "shots",
  goal: "goals",
  tackle: "tackles",
  interception: "interceptions",
  foul: "fouls",
};

/**
 * The actions a claim is about, in words: "passes in the final third through the centre".
 * The same wording the backend uses (app/hypotheses.py), and never the raw ranges.
 */
export function describeWhere(where: ClaimWhere): string {
  const types = where.types ?? [];
  const noun = !types.length || types.length > 3
    ? "actions"
    : types.map((t) => TYPE_NOUNS[t] ?? `${t}s`).join(" and ");
  const bits = [noun];
  if (where.x) {
    const [lo, hi] = where.x;
    const third = hi <= 40
      ? "their own third"
      : lo >= 60
        ? "the final third"
        : lo >= 25 && hi <= 75
          ? "the middle third"
          : null;
    bits.push(third ? `in ${third}` : "in one part of the pitch");
  }
  if (where.y) {
    const [lo, hi] = where.y;
    const side = hi <= 40
      ? "on one flank (the low-y side)"
      : lo >= 60
        ? "on one flank (the high-y side)"
        : lo >= 25 && hi <= 75
          ? "through the centre"
          : "on one side";
    bits.push(side);
  }
  return bits.join(" ");
}

/** "minutes 58 to 63": the window the claim was tested in. */
export function claimWindow(claim: HypothesisClaim): string {
  return `minutes ${Math.floor(claim.from)} to ${Math.floor(claim.to)}`;
}

/** A claim about a share of the team's actions, or about a rate per minute. */
export function measureLabel(measure: HypothesisClaim["measure"]): string {
  return measure === "rate" ? "per minute" : "of their actions";
}

/** The measured value against the baseline, in the words the measure uses. */
export function valueLabel(claim: HypothesisClaim): string | null {
  if (claim.value === undefined || claim.baseline === undefined) return null;
  if (claim.measure === "rate") return `${claim.value} a minute against ${claim.baseline} a minute`;
  return `${Math.round(claim.value * 100)}% against ${Math.round(claim.baseline * 100)}%`;
}

/** The counts behind the test: "12 of 31 actions, against 41 of 1140". */
export function countsLabel(claim: HypothesisClaim): string {
  return `${claim.hits} of ${claim.n} actions, against ${claim.baseline_hits} of ${claim.baseline_n}`;
}

export type VerdictTone = "accent" | "warn" | "quiet";

/** supported = green, not supported = amber, too little data = muted. */
export function verdictTone(verdict: HypothesisClaim["verdict"]): VerdictTone {
  if (verdict === "supported") return "accent";
  if (verdict === "not supported") return "warn";
  return "quiet";
}

export const VERDICT_LABELS: Record<HypothesisClaim["verdict"], string> = {
  supported: "supported",
  "not supported": "not supported",
  "too little data": "too little data",
};
