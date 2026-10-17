// web/src/lib/why.ts - turns an insight's `chain` and the /why response into UI types. Unknown shapes are skipped.
import { isObj, num, str, strList } from "@/lib/read";

export interface ChainStep {
  label: string;
  minute?: number;
  player?: string;
  evidence: string[]; // event ids, so the pitch can highlight the step
}

export interface WhyReason {
  text: string;
  minute?: number;
  evidence: string[];
  insightId?: string;
}

export interface MatchWhy {
  title?: string;
  summary?: string;
  winner?: string;
  reasons: WhyReason[];
  evidence: string[];
}

const EVENT_ID = /^e\d+$/i;
const prettify = (s: string): string => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

function normalizeStep(item: unknown): ChainStep[] {
  if (typeof item === "string") return item.trim() === "" ? [] : [{ label: item.trim(), evidence: [] }];
  if (!isObj(item)) return [];
  const type = str(item.type);
  const label =
    str(item.label) ?? str(item.text) ?? str(item.why) ?? str(item.description) ?? str(item.summary) ??
    (type !== undefined ? prettify(type) : undefined);
  if (label === undefined) return [];
  const id = str(item.id);
  const eventId = str(item.event_id) ?? str(item.event) ?? (id !== undefined && EVENT_ID.test(id) ? id : undefined);
  const evidence = [...new Set([...strList(item.evidence), ...(eventId !== undefined ? [eventId] : [])])];
  return [{ label, minute: num(item.minute), player: str(item.player) ?? str(item.name), evidence }];
}

/** An insight's chain: a list of strings or objects, an object with `steps`, or "a -> b -> c". */
export function normalizeChain(raw: unknown): ChainStep[] {
  if (typeof raw === "string") {
    return raw
      .split(/\s*(?:→|->|=>)\s*/)
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map((label) => ({ label, evidence: [] }));
  }
  const list = Array.isArray(raw) ? raw : isObj(raw) && Array.isArray(raw.steps) ? raw.steps : [];
  return list.flatMap(normalizeStep);
}

function normalizeReason(item: unknown): WhyReason[] {
  if (typeof item === "string") return item.trim() === "" ? [] : [{ text: item, evidence: [] }];
  if (!isObj(item)) return [];
  const text =
    str(item.text) ?? str(item.why) ?? str(item.reason) ?? str(item.label) ?? str(item.description) ??
    str(item.summary) ?? str(item.title);
  if (text === undefined) return [];
  return [{ text, minute: num(item.minute), evidence: strList(item.evidence), insightId: str(item.insight_id) }];
}

export function normalizeWhy(raw: unknown): MatchWhy | null {
  if (typeof raw === "string") return raw.trim() === "" ? null : { summary: raw, reasons: [], evidence: [] };
  if (!isObj(raw)) return null;
  const title = str(raw.title) ?? str(raw.headline);
  const summary = str(raw.summary) ?? str(raw.text) ?? str(raw.explanation) ?? str(raw.why);
  const rawReasons = [raw.reasons, raw.factors, raw.points, raw.causes, raw.key_moments, raw.steps, raw.chain]
    .find(Array.isArray);
  const reasons = Array.isArray(rawReasons) ? rawReasons.flatMap(normalizeReason) : [];
  if (title === undefined && summary === undefined && reasons.length === 0) return null;
  return { title, summary, winner: str(raw.winner) ?? str(raw.team), reasons, evidence: strList(raw.evidence) };
}