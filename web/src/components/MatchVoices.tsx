// web/src/components/MatchVoices.tsx - one match, a different brief for every audience.
import { Button } from "@/components/Button";
import { EvidenceChips } from "@/components/EvidenceChips";
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getVoices, profileQuery } from "@/lib/api";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";

export function MatchVoices() {
  const { lang, profile } = useMatch();
  const { data, loading, error, retry } = useApi(getVoices, profileQuery(profile, lang));
  const voices = data?.voices ?? [];

  if (loading) return <Loader label="Writing the voices" />;
  if (error !== null) {
    return (
      <p role="alert" className={ui.banner}>
        Couldn't write the voices ({error}). <Button className={ui.bannerButton} onClick={retry}>Retry</Button>
      </p>
    );
  }
  if (!data) return null;

  return (
    <section className={ui.panel} aria-label="One match in different voices">
      <h3 className={ui.h3}>The same match, three sides</h3>
      <p className={ui.empty}>{data.note}</p>
      <div className="grid gap-3 lg:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
        {voices.map((voice) => (
          <div key={voice.voice} className="grid content-start gap-2 rounded-card bg-surface-2 px-3.5 py-3">
            <span className="text-[.7rem] font-semibold uppercase text-muted">{voice.label}</span>
            <p className="m-0 leading-snug" lang={lang}>{voice.text}</p>
            {voice.inputs?.length ? (
              <p className={ui.chips} aria-label={`${voice.label} received`}>
                {voice.inputs.map((key) => <span key={key} className={ui.chip}>{key}</span>)}
              </p>
            ) : null}
            <EvidenceChips ids={voice.evidence} highlight={false} />
          </div>
        ))}
      </div>
    </section>
  );
}
