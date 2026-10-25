// web/src/components/ReviewPanel.tsx - the player's written review: text, rating and the evidence it cites.
import { Button } from "@/components/Button";
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getPlayerReview } from "@/lib/api";
import { stripCitations } from "@/lib/match";
import { formatRating } from "@/lib/players";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

const loadReview = (key: string) => {
  const [id, lang] = key.split("\n");
  return getPlayerReview(id, lang);
};

export function ReviewPanel({ id, lang }: { id: string; lang: string }) {
  const { pinned, pin } = useMatch();
  const { data, loading, error, notFound } = useApi(loadReview, `${id}\n${lang}`);
  const on = data !== null && pinned !== null && pinned.join() === data.evidence.join();

  return (
    <section className={ui.panel} aria-label="Player review">
      <h3 className={ui.h3}>Review</h3>

      {loading && <Loader label="Loading review" />}
      {notFound && <p className={ui.empty}>Player not found.</p>}
      {error !== null && !notFound && <p className={ui.empty}>The review isn't available right now.</p>}

      {data && (
        <>
          <p className="m-0 text-[1.05rem] leading-relaxed" lang={lang}>
            {stripCitations(data.text)}
          </p>

          {data.rating !== null && (
            <p className="m-0 flex items-baseline gap-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-muted">
                Rating
              </span>
              <span className="font-heading text-xl font-bold tabular-nums text-fg">
                {formatRating(data.rating)}
              </span>
            </p>
          )}

          {data.evidence.length > 0 && (
            <>
              <div className={ui.chips}>
                {data.evidence.map((e) => (
                  <span key={e} className={`${ui.chip} font-mono`}>{e}</span>
                ))}
              </div>
              <div>
                <Button
                  aria-pressed={on}
                  onClick={() => pin(on ? null : data.evidence)}
                  aria-label={on ? "Stop highlighting evidence on pitch" : "Highlight evidence on pitch"}
                >
                  {on ? "Hide on pitch" : "Highlight evidence on pitch"}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}