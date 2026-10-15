// web/src/pages/AboutPage.tsx - how it works, for judges.
export function AboutPage() {
  return (
    <section className="page">
      <h2>How it works</h2>
      <p>
        Football stories do not end at the scoreline. This dashboard replays a match event by event
        and explains the tactical moments as they happen, with proof you can click.
      </p>

      <ol className="steps">
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
      </ol>

      <h3>Data and endpoints</h3>
      <ul className="plain">
        <li>The match data is synthetic, supplied for the hackathon.</li>
        <li><code>GET /events</code>: the whole match, in time order.</li>
        <li><code>GET /stream</code>: live insights over Server-Sent Events.</li>
        <li><code>GET /health</code>: status and narration languages.</li>
      </ul>

      <h3>Pages</h3>
      <ul className="plain">
        <li><a className="link" href="#/">Live</a>: pitch and insight feed.</li>
        <li><a className="link" href="#/recap">Timeline</a>: every insight by minute, plus the recap.</li>
        <li><a className="link" href="#/announcers">Announcers</a>: on-air line, cue sheet and proof to fact-check.</li>
        <li><a className="link" href="#/fans">Fans</a>: follow a team, share moments, see the proof.</li>
      </ul>
    </section>
  );
}