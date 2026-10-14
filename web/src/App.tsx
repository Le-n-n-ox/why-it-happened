// web/src/App.tsx - minimal live timeline; style it once it works.
import { useInsightStream } from "./useInsightStream";

export default function App() {
  const insights = useInsightStream();

  return (
    <main>
      <h1>Why It Happened</h1>
      {insights.length === 0 && <p>Waiting for the match...</p>}
      {insights.map((i) => (
        <article key={i.id}>
          <h3>
            {Math.floor(i.minute)}' {i.team}: {i.kind.replace("_", " ")}
          </h3>
          <p>{i.narration["en"]}</p>
          <small>Evidence: {i.evidence.join(", ")}</small>
        </article>
      ))}
    </main>
  );
}
