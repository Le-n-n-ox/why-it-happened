// web/src/types.ts - mirrors the JSON the FastAPI service sends.
export interface Insight {
  id: string;                                     // e.g. "counter_attack-e1"
  kind: string;                                   // "counter_attack", ...
  team: string;
  minute: number;
  evidence: string[];                             // ids of the events that prove it
  facts: Record<string, string | number>;
  narration: Record<string, string>;              // language code -> text, e.g. { en: "...", sw: "..." }
}
