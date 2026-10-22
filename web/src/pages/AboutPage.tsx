// web/src/pages/AboutPage.tsx - how it works, for judges.
import { ui } from "../lib/ui";

const CODE = "rounded bg-surface-2 px-1.5 py-px";

export function AboutPage() {
  return (
    <section className={ui.page}>
      <h2 className={ui.h2}>How it works</h2>
      <p>
        Football stories do not end at the scoreline. This dashboard replays a match event by event
        and explains the tactical moments as they happen, with proof you can click.
      </p>

      <ol className="grid list-decimal gap-2.5 pl-5">
        <li>
          <strong>Rules detect.</strong> A Python service scans the events for tactical moments such
          as counter-attacks. Detection is deterministic, so every insight can be reproduced.
        </li>
        <li>
          <strong>The model narrates.</strong> Each insight gets a plain-language sentence in one or
          more languages. Without an AI key, built-in template sentences are used.
        </li>
        <li>
          <strong>Evidence proves.</strong> Every narration cites the exact event ids behind it.
          Select an insight to see those events and the path of the move on the pitch.
        </li>
        <li>
          <strong>Claims get tested.</strong> For each goal the model may propose an explanation.
          The rules then count the events and decide, with a p-value and a corrected threshold, so
          a claim the data does not support is shown as not supported.
        </li>
      </ol>

      <h3 className={ui.h3}>Data and endpoints</h3>
      <ul className="grid list-disc gap-1.5 pl-5">
        <li>The match data is synthetic, supplied for the hackathon.</li>
        <li><code className={CODE}>GET /events</code>: the whole match, in time order.</li>
        <li><code className={CODE}>GET /stream</code>: live insights over Server-Sent Events.</li>
        <li><code className={CODE}>GET /health</code>: status and narration languages.</li>
        <li><code className={CODE}>GET /ask</code>: a question answered from the match facts.</li>
        <li><code className={CODE}>GET /positions</code>: where each player was last seen.</li>
        <li><code className={CODE}>GET /goals/&#123;id&#125;/hypotheses</code>: tested claims about a goal.</li>
      </ul>

      <h3 className={ui.h3}>Pages</h3>
      <ul className="grid list-disc gap-1.5 pl-5">
        <li><a className={ui.link} href="#/">Live</a>: pitch and insight feed.</li>
        <li><a className={ui.link} href="#/recap">Timeline</a>: every insight by minute, plus the recap.</li>
        <li><a className={ui.link} href="#/ask">Ask the match</a>: a question, answered from the facts.</li>
        <li><a className={ui.link} href="#/positions">Positions</a>: where each player was last seen.</li>
        <li><a className={ui.link} href="#/analytics">Analytics</a>: live stats and charts.</li>
        <li><a className={ui.link} href="#/players">Players</a>: ratings, breakdowns and reviews.</li>
        <li><a className={ui.link} href="#/history">History</a>: insights saved in the database.</li>
        <li><a className={ui.link} href="#/announcers">Announcers</a>: on-air line, cue sheet and proof to fact-check.</li>
        <li><a className={ui.link} href="#/fans">Fans</a>: follow a team, share moments, see the proof.</li>
      </ul>
    </section>
  );
}