// web/src/components/MatchVoices.tsx - the same facts, written for a fan, an announcer and an analyst.
import { Button } from "@/components/Button";
import { EvidenceChips } from "@/components/EvidenceChips";
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getVoices } from "@/lib/api";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

export function MatchVoices() {
  const { lang } = useMatch();
  const { data, loading, error, retry } = useApi(getVoices, lang);
  const voices = data?.voices ?? [];

  if (loading) return <Loader label="Writing the three voices" />;
  if (error !== null) {
    return (
      <p role="alert" className={ui.banner}>
        Couldn't write the voices ({error}). <Button className={ui.bannerButton} onClick={retry}>Retry</Button>
      </p>
    );
  }
  if (!data) return null;

  return (
    <section className={ui.panel} aria-label="The same facts in three voices">
      <h3 className={ui.h3}>The same result, three ways</h3>
      <p className={ui.empty}>{data.note}</p>
      <div className="grid gap-3 lg:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
        {voices.map((voice) => (
          <div key={voice.voice} className="grid content-start gap-2 rounded-card bg-surface-2 px-3.5 py-3">
            <span className="text-[.7rem] font-semibold uppercase text-muted">{voice.label}</span>
            <p className="m-0 leading-snug" lang={lang}>{voice.text}</p>
            <EvidenceChips ids={voice.evidence} highlight={false} />
          </div>
        ))}
      </div>
    </section>
  );
}
