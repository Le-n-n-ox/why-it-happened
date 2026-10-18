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
  const { pin } = useMatch();
  const { data, loading, error, notFound } = useApi(loadReview, `${id}\n${lang}`);

  return (
    <section className={ui.panel} aria-label="Player review">
      <h3 className={ui.h3}>Review</h3>
      {loading && <Loader label="Loading review" />}
      {notFound && <p className={ui.empty}>Player not found.</p>}
      {error !== null && !notFound && <p className={ui.empty}>The review isn't available right now.</p>}
      {data && (
        <>
          <p className="m-0 text-[1.05rem] leading-snug" lang={lang}>{stripCitations(data.text)}</p>
          <div className={ui.chips}>
            {data.rating !== null && <span className={ui.chip}>Rating {formatRating(data.rating)}</span>}
            {data.evidence.map((e) => <span key={e} className={`${ui.chip} font-mono`}>{e}</span>)}
          </div>
          {data.evidence.length > 0 && (
            <div>
              <Button onClick={() => pin(data.evidence)}>Highlight evidence on pitch</Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}