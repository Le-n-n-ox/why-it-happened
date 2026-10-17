// web/src/components/ReviewPanel.tsx - the player's written review in the selected language.
import { useEffect, useState } from "react";
import { getPlayerReview } from "../lib/api";
import { stripCitations } from "../lib/match";
import { formatRating, normalizeReview } from "../lib/players";
import { ui } from "../lib/ui";
import type { PlayerReview } from "../types/types";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";

type ReviewState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; review: PlayerReview | null };

interface Props {
  id: string;
  lang: string;
  onShow: (ids: string[], label: string) => void;
}

export function ReviewPanel({ id, lang, onShow }: Props) {
  const [state, setState] = useState<ReviewState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    getPlayerReview(id, lang)
      .then((raw) => {
        if (!cancelled) setState({ status: "ok", review: normalizeReview(raw) });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [id, lang]);

  return (
    <section className={ui.panel} aria-label="Player review">
      <h3 className={ui.h3}>Review</h3>
      {state.status === "loading" && <Skeleton />}
      {state.status === "error" && <p className={ui.empty}>The review isn't available right now.</p>}
      {state.status === "ok" && state.review === null && (
        <p className={ui.empty}>No review for this player yet.</p>
      )}
      {state.status === "ok" && state.review !== null && (
        <>
          <p className="m-0 text-[1.05rem] leading-snug" lang={state.review.lang || lang}>
            {stripCitations(state.review.text)}
            {state.review.lang !== "" && state.review.lang !== lang && (
              <span className={ui.tag}>{state.review.lang.toUpperCase()}</span>
            )}
          </p>
          <div className={ui.chips}>
            {state.review.rating !== null && (
              <span className={ui.chip}>Rating {formatRating(state.review.rating)}</span>
            )}
            {state.review.evidence.map((e) => <span key={e} className={ui.chip}>{e}</span>)}
          </div>
          {state.review.evidence.length > 0 && (
            <div>
              <Button onClick={() => onShow(state.review ? state.review.evidence : [], "review evidence")}>
                Show evidence on pitch
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}