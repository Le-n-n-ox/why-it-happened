// web/src/hooks/useAsk.ts - ask the match a question: one request for the answer, another for the rules-only comparison.
import { useCallback, useRef, useState } from "react";
import { getAsk } from "@/lib/api";
import type { AskResponse } from "@/types/types";

export type AskMode = "auto" | "rules";

interface State {
  answer: AskResponse | null;
  compare: AskResponse | null; // the same question answered by the rules alone
  loading: boolean;
  comparing: boolean;
  error: string | null;
  compareError: string | null;
}

const IDLE: State = {
  answer: null,
  compare: null,
  loading: false,
  comparing: false,
  error: null,
  compareError: null,
};

export function useAsk() {
  const [state, setState] = useState<State>(IDLE);
  // Every request carries a number. Only the newest one may write to the state.
  const run = useRef(0);

  const ask = useCallback(async (question: string, lang: string, mode: AskMode, previous?: string) => {
    const id = ++run.current;
    setState((s) => ({ ...s, loading: true, error: null, compare: null, compareError: null }));
    try {
      const answer = await getAsk(question, lang, mode, previous);
      if (id !== run.current) return; // a newer question won
      setState((s) => ({ ...s, answer, loading: false }));
    } catch (e) {
      if (id !== run.current) return;
      setState((s) => ({
        ...s,
        answer: null,
        loading: false,
        error: e instanceof Error ? e.message : "The question could not be sent.",
      }));
    }
  }, []);

  /** The same question with the model switched off, so the two answers can be put side by side. */
  const compareWithRules = useCallback(async (question: string, lang: string, previous?: string) => {
    const id = run.current;
    setState((s) => ({ ...s, comparing: true, compareError: null }));
    try {
      const result = await getAsk(question, lang, "rules", previous);
      if (id !== run.current) return;
      setState((s) => ({ ...s, compare: result, comparing: false }));
    } catch (e) {
      if (id !== run.current) return;
      setState((s) => ({
        ...s,
        comparing: false,
        compareError: e instanceof Error ? e.message : "The comparison could not be loaded.",
      }));
    }
  }, []);

  const reset = useCallback(() => {
    run.current += 1; // any request still in flight is now stale
    setState(IDLE);
  }, []);

  // `compare` is the rules answer in the state; the request that fetches it is `compareWithRules`.
  return { ...state, ask, compareWithRules, reset };
}
