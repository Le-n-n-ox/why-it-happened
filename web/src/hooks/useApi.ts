// web/src/hooks/useApi.ts - fetch on mount (and when `arg` changes) with loading, error, not-found and retry.
// `load` must be a stable function (module-level), `arg` a primitive.
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";

interface ApiState<T> {
  data: T | null;
  error: string | null;
  notFound: boolean; // a 404 means a bad id: show "not found"
  loading: boolean;
}

export function useApi<T, A>(load: (arg: A) => Promise<T>, arg: A) {
  const [state, setState] = useState<ApiState<T>>({ data: null, error: null, notFound: false, loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, error: null, notFound: false, loading: true });
    load(arg)
      .then((data) => {
        if (!cancelled) setState({ data, error: null, notFound: false, loading: false });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          data: null,
          error: e instanceof Error ? e.message : "Request failed",
          notFound: e instanceof ApiError && e.status === 404,
          loading: false,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [load, arg, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}