// web/src/lib/loose.ts - tolerant readers for fields whose exact shape the contract does not list yet.
export const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const num = (v: unknown): number | undefined => {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
};

export const firstText = (...vals: unknown[]): string | undefined =>
  vals.find((v): v is string => typeof v === "string" && v.trim() !== "");

export const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** The first of `keys` that is present on `obj`. */
export const pick = (obj: Record<string, unknown>, keys: string[]): unknown => {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
};