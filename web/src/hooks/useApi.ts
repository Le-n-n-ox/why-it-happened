// web/src/useApi.ts - fetch on mount (and when `arg` changes) with loading, error and retry.
// `load` must be a stable function (module-level), `arg` a primitive.
import { useCallback, useEffect, useState } from "react";

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useApi<T, A>(load: (arg: A) => Promise<T>, arg: A) {
  const [state, setState] = useState<ApiState<T>>({ data: null, error: null, loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, error: null, loading: true });
    load(arg)
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({ data: null, error: e instanceof Error ? e.message : "Request failed", loading: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [load, arg, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}