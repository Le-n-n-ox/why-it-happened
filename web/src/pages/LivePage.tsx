// web/src/pages/LivePage.tsx - the live dashboard: pitch + insight feed.
import { useState } from "react";

import { attackZones } from "@/lib/analytics";
import { InsightCard } from "@/components/InsightCard";
import { Loader } from "@/components/Loader";
import { evidenceEvents, teamColor } from "@/lib/match";
import { useMatch } from "@/types/matchContext";
import { Pitch } from "@/components/Pitch";
import { PowerSwitch } from "@/components/PowerSwitch";
import { Recap } from "@/components/Recap";
import { ui } from "@/lib/ui";
import { WhyPanel } from "@/components/WhyPanel";

export function LivePage() {
  const { insights, status, teams, shown, byId, lang, ended, selectedId, select } = useMatch();
  const [showZones, setShowZones] = useState(false);
  const selected = evidenceEvents(insights.find((i) => i.id === selectedId), byId);

  return (
    <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-4 max-[1100px]:grid-cols-1">
      {teams.length > 0 && (
        <div className="grid gap-2">
          <div className="flex justify-end">
            <PowerSwitch checked={showZones} onChange={() => setShowZones((v) => !v)} label="Attack zones" />
          </div>
          <Pitch
            events={shown}
            selected={selected}
            teams={teams}
            zones={showZones ? attackZones(shown, teams) : undefined}
          />
          {selectedId && (
            <a className={ui.link} href={`#/insight/${encodeURIComponent(selectedId)}`}>
              Open full detail for this insight →
            </a>
          )}
        </div>
      )}

      <section
        className="pr-1 min-[1101px]:col-start-2 min-[1101px]:max-h-[80vh] min-[1101px]:overflow-y-auto"
        aria-live="polite"
        aria-label="Live insights"
      >
        {insights.length === 0 && status !== "error" && (
          <>
            <p className={ui.empty}>Waiting for the first insight...</p>
            <Loader label="Loading insights" />
          </>
        )}
        <ul className="grid gap-2.5">
          {insights.map((i) => (
            <InsightCard
              key={i.id}
              insight={i}
              lang={lang}
              color={teamColor(i.team, teams)}
              selected={i.id === selectedId}
              onSelect={select}
            />
          ))}
        </ul>
      </section>

      {/* The new WhyPanel can be placed full-width under the main grids */}
      <div className="col-span-2 max-[1100px]:col-span-1">
        <WhyPanel />
      </div>

      <div className="col-span-2 max-[1100px]:col-span-1">
        <Recap insights={insights} lang={lang} ended={ended} />
      </div>
    </div>
  );
}