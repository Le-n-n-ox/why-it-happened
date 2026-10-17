export function Loader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="loader" role="status" aria-label={label}>
      <div className="loader__container" aria-hidden="true">
        <div className="loader__ball">
          <div className="loader__inner">
            <div className="loader__line" />
            <div className="loader__line loader__line--two" />
            <div className="loader__oval" />
            <div className="loader__oval loader__oval--two" />
          </div>
        </div>
        <div className="loader__shadow" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
