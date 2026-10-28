// web/src/components/ValidationNote.tsx - how our numbers compared with real matches. Shows nothing until /validation is available.
import { useApi } from "@/hooks/useApi";
import { getValidation } from "@/lib/api";
import type { Validation } from "@/types/types";

// The contract: mean_shot_x should be close to 100. A much lower number means the pitch direction was
// misread, so show nothing and ask the backend. 70 is the cut-off used here.
const MIN_PLAUSIBLE_SHOT_X = 70;

function sentence(v: Validation): string | null {
  if (!v.available || v.matches === undefined) return null;
  const meanX = v.shot_value?.mean_shot_x;
  if (meanX !== undefined && meanX < MIN_PLAUSIBLE_SHOT_X) return null;

  const parts: string[] = [];
  const corr = v.shot_value?.correlation;
  if (corr !== undefined) parts.push(`our shot values correlate ${corr} with StatsBomb's xG`);

  const table = v.win_probability ?? {};
  const minutes = Object.keys(table).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  const minute = minutes[minutes.length - 1];
  const row = minute !== undefined ? table[String(minute)] : undefined;
  if (row?.ours !== undefined && row.base_rate !== undefined) {
    parts.push(
      row.ours < row.base_rate
        ? `our win probability scores ${row.ours} at minute ${minute} against ${row.base_rate} for always predicting the average (lower is better)`
        : `our win probability is no better than the average yet (${row.ours} at minute ${minute} against ${row.base_rate} for always predicting the average; lower is better)`,
    );
  }

  const head = `Checked on ${v.matches} real matches${v.source ? ` (${v.source})` : ""}`;
  return parts.length > 0 ? `${head}: ${parts.join(", and ")}.` : `${head}.`;
}

export function ValidationNote() {
  const { data } = useApi(getValidation, "now");
  const text = data ? sentence(data) : null;
  if (text === null) return null;
  return <p className="m-0 text-xs text-muted">{text}</p>;
}