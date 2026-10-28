// web/src/components/Recap.tsx - full-time recap text from /recap. The server writes it, so nothing is added here.
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getRecap } from "@/lib/api";
import { stripCitations } from "@/lib/match";
import { ui } from "@/lib/ui";

export function Recap({ lang }: { lang: string }) {
  const { data, loading, error } = useApi(getRecap, lang);
  return (
    <section
      className="rounded-card border border-line bg-surface px-5 py-4"
      aria-label="Full-time recap"
    >
      {/* Was <h2>; changed to <h3> so the page keeps one h2 (its title) and the recap is a sub-section. */}
      <h3 className={`${ui.h3} mb-3`}>Full-time recap</h3>

      {loading && <Loader label="Loading recap" />}
      {error !== null && <p className={ui.empty}>The recap isn't available yet.</p>}

      {data && (
        <p className="m-0 text-[.95rem] leading-relaxed" lang={lang}>
          {stripCitations(data.text)}
        </p>
      )}
    </section>
  );
}