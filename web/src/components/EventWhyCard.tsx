// web/src/components/EventWhyCard.tsx - why one event mattered: /events/{id}/why, evidence highlighted on the pitch.
import { useEffect } from "react";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/Button";
import { EvidenceChips } from "@/components/EvidenceChips";
import { Loader } from "@/components/Loader";
import { useApi } from "@/hooks/useApi";
import { getEventWhy } from "@/lib/api";
import { formatMinute } from "@/lib/match";
import { prettyKey } from "@/lib/players";
import { ui } from "@/lib/ui";
import { useMatch } from "@/types/matchContext";
import { QualityBlock } from "@/components/QualityBlock";

export function EventWhyCard({ eventId, onClose }: { eventId: string; onClose?: () => void }) {
  const { pin } = useMatch();
  const { data, loading, error, notFound, retry } = useApi(getEventWhy, eventId);

  // The cited events light up on the pitch while the card is open.
  useEffect(() => {
    if (!data) return;
    pin(data.evidence);
    return () => pin(null);
  }, [data, pin]);

  return (
    <section className={ui.panel} aria-label={`Why event ${eventId} mattered`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={ui.h3}>Event {eventId}</h3>
        {onClose && (
          <Button
            onClick={onClose}
            aria-label="Close explanation"
            className="grid size-9 place-items-center rounded-full border border-line bg-surface-2 p-0 text-muted transition-colors hover:bg-surface-3 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={16} aria-hidden="true" />
          </Button>
        )}
      </div>

      {loading && <Loader label="Loading explanation" />}
      {notFound && <p className={ui.empty}>Event not found.</p>}
      {error !== null && !notFound && (
        <p className={ui.empty}>
          Couldn't load this explanation. <Button onClick={retry}>Retry</Button>
        </p>
      )}

      {data && (
        <>
          <p className={ui.meta}>
            <span className={ui.minute}>{formatMinute(data.minute)}</span>
            {data.player && <span>{data.player}</span>}
            <span>{data.team}</span>
            <span>{prettyKey(data.action)}</span>
            {data.role && <span className={ui.chip}>{data.role}</span>}
            {data.routine && <span className={ui.quiet}>Routine</span>}
          </p>

          <p className="m-0 leading-snug">{data.why}</p>

          {data.detail && (
            <p className="m-0 text-[.9rem] leading-relaxed text-muted">{data.detail}</p>
          )}

          {data.action === "pass" && <QualityBlock quality={data.quality} />}

          {(data.factors ?? []).length > 0 && (
            <div className={ui.chips}>
              {(data.factors ?? []).map((f) => (
                <span key={f} className={ui.chip}>{prettyKey(f)}</span>
              ))}
            </div>
          )}

          {/* Replaced the duplicated evidence chips + optional highlight button with the shared primitive */}
          <EvidenceChips ids={data.evidence} />

          {data.insight_id && (
            <a
              className={`${ui.link} inline-flex items-center gap-1 hover:gap-2 transition-all`}
              href={`#/insight/${encodeURIComponent(data.insight_id)}`}
            >
              Open insight <ArrowRight size={14} aria-hidden="true" />
            </a>
          )}
        </>
      )}
    </section>
  );
}