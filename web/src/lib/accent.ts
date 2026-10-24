export const ACCENTS = [
  { id: "moss", label: "Moss", color: "#2f9e57" },
  { id: "ocean", label: "Ocean", color: "#2b9fd0" },
  { id: "ember", label: "Ember", color: "#e0703a" },
  { id: "plum", label: "Plum", color: "#9a5bd6" },
  { id: "indigo", label: "Indigo", color: "#5967e0" },
] as const;

export type Accent = (typeof ACCENTS)[number]["id"];
const KEY = "wih-accent";

export function getAccent(): Accent {
  try {
    const v = localStorage.getItem(KEY);
    return ACCENTS.some((a) => a.id === v) ? (v as Accent) : "moss";
  } catch {
    return "moss"; // storage can be blocked
  }
}

export function setAccent(a: Accent) {
  document.documentElement.dataset.accent = a;
  try {
    localStorage.setItem(KEY, a);
  } catch {
    /* storage blocked: ignore */
  }
}

/** Call once before render so the saved accent shows on first paint. */
export function applyStoredAccent() {
  document.documentElement.dataset.accent = getAccent();
}