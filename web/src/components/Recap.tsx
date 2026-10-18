// web/src/components/Recap.tsx - full-time recap text from /recap. The server writes it, so nothing is added here.
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getRecap } from "@/lib/api";
import { stripCitations } from "@/lib/match";
import { ui } from "@/lib/ui";

export function Recap({ lang }: { lang: string }) {
  const { data, loading, error } = useApi(getRecap, lang);
  return (
    <section className="rounded-card border border-line bg-surface px-[18px] py-3.5" aria-label="Full-time recap">
      <h2 className={`${ui.h2} mb-2`}>Full-time recap</h2>
      {loading && <Loader label="Loading recap" />}
      {error !== null && <p className={ui.empty}>The recap isn't available yet.</p>}
      {data && <p className="m-0" lang={lang}>{stripCitations(data.text)}</p>}
    </section>
  );
}