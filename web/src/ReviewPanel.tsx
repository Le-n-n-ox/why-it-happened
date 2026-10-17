// web/src/ReviewPanel.tsx - the player's written review in the selected language.
import { useEffect, useState } from "react";
import { getPlayerReview } from "./api";
import { stripCitations } from "./match";
import { formatRating, normalizeReview } from "./players";
import type { PlayerReview } from "./types";

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
    <section className="panel" aria-label="Player review">
      <h3>Review</h3>
      {state.status === "loading" && (
        <div className="skeletons" aria-hidden="true">
          <div className="skeleton" />
        </div>
      )}
      {state.status === "error" && <p className="empty">The review isn't available right now.</p>}
      {state.status === "ok" && state.review === null && <p className="empty">No review for this player yet.</p>}
      {state.status === "ok" && state.review !== null && (
        <>
          <p className="review__text" lang={state.review.lang || lang}>
            {stripCitations(state.review.text)}
            {state.review.lang !== "" && state.review.lang !== lang && (
              <span className="tag">{state.review.lang.toUpperCase()}</span>
            )}
          </p>
          <div className="card__chips">
            {state.review.rating !== null && <span className="chip">Rating {formatRating(state.review.rating)}</span>}
            {state.review.evidence.map((e) => <span key={e} className="chip">{e}</span>)}
          </div>
          {state.review.evidence.length > 0 && (
            <div>
              <button type="button" onClick={() => onShow(state.review ? state.review.evidence : [], "review evidence")}>
                Show evidence on pitch
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}