// web/src/hooks/useCompare.ts - the player to compare with, kept in the real query string so a link can be shared.
import { useCallback, useState } from "react";

function read(): string | null {
  return new URLSearchParams(window.location.search).get("vs");
}

/**
 * The hash router has no query strings, so the compare choice lives in ?vs= instead:
 * a shared compare link is origin/path?vs=<otherPlayerId>#/player/<playerId>.
 */
export function useCompare() {
  const [vs, setVsState] = useState<string | null>(read);

  const setVs = useCallback((id: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (id) params.set("vs", id);
    else params.delete("vs");
    const search = params.toString();
    const { pathname, hash } = window.location;
    window.history.replaceState(null, "", `${pathname}${search ? `?${search}` : ""}${hash}`);
    setVsState(id);
  }, []);

  return { vs, setVs };
}
