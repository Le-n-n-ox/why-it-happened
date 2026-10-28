import type { MatchEvent } from "@/types/types";

function zone(x: number): string {
  if (x >= 67) return "attacking third";
  if (x >= 34) return "middle third";
  return "defensive third";
}

/** Short live play-by-play from the event feed; it does not wait for a key-moment detector. */
export function describeEvent(event: MatchEvent, technical = false): string {
  const actor = event.player ? `${event.player} ` : "";
  const where = zone(event.x);
  switch (event.type) {
    case "pass":
      if (event.outcome?.toLowerCase().includes("complete")) {
        return technical
          ? `${event.team} retain possession as ${actor}completes a pass from the ${where}, maintaining the build-up phase.`
          : `${event.team} keep the ball: ${actor}completes a pass in the ${where}.`;
      }
      return technical
        ? `${actor}cannot complete the pass for ${event.team}; the possession sequence breaks down.`
        : `${event.team}'s pass from ${actor.trim() || "the ball"} is incomplete.`;
    case "carry":
      return technical
        ? `${event.team} progress through the ${where} with a ball carry by ${event.player ?? "the player in possession"}.`
        : `${event.team} carry the ball through the ${where}${event.player ? ` with ${event.player}` : ""}.`;
    case "shot": {
      const outcome = event.outcome?.toLowerCase() ?? "";
      const result = outcome.includes("goal") ? "scores" : outcome.includes("saved") ? "has a shot saved" : outcome.includes("block") ? "has a shot blocked" : outcome.includes("off t") || outcome.includes("post") ? "shoots off target" : "takes a shot";
      return `${event.team}: ${actor}${result}${technical ? ` from the ${where}` : ""}.`;
    }
    case "goal":
      return `${event.team} score${event.player ? ` through ${event.player}` : ""}.`;
    case "tackle":
      return `${event.team} make a defensive intervention${event.player ? ` through ${event.player}` : ""}${technical ? ` in the ${where}` : ""}.`;
    case "interception":
      return `${event.team} regain possession${event.player ? ` through ${event.player}` : ""}${technical ? ` in the ${where}` : ""}.`;
    case "foul":
      return `Play is stopped for a foul involving ${event.team}${event.player ? ` and ${event.player}` : ""}.`;
    case "possession":
      return `${event.team} win possession${event.player ? ` through ${event.player}` : ""} in the ${where}.`;
    case "pressure": {
      const speed = event.player_speed_kph ? ` at ${event.player_speed_kph.toFixed(1)} km/h` : "";
      return `${event.team} apply pressure${event.player ? ` through ${event.player}` : ""} in the ${where}${speed}.`;
    }
    default:
      return `${event.team} are involved in the play.`;
  }
}
