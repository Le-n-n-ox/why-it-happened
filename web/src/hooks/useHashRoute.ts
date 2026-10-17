// web/src/useHashRoute.ts - tiny hash router: "#/recap" -> "/recap". No dependency.
import { useEffect, useState } from "react";

function readHash(): string {
  return window.location.hash.replace(/^#/, "") || "/";
}

export function useHashRoute(): string {
  const [path, setPath] = useState(readHash);
  useEffect(() => {
    const onChange = () => setPath(readHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return path;
}