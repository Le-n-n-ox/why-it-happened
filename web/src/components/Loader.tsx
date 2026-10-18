// Shared by the six ball seams: a ring drawn on ::before and ::after.
const LINE =
  "before:absolute before:size-[99%] before:rounded-full before:border-2 before:border-neutral-700 before:content-[''] after:absolute after:size-[99%] after:rounded-full after:border-2 after:border-neutral-700 after:content-['']";
const OVAL =
  "before:absolute before:size-[99%] before:rounded-full before:border-t-4 before:border-neutral-700 before:content-[''] after:absolute after:size-[99%] after:rounded-full after:border-t-4 after:border-neutral-700 after:content-['']";

export function Loader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="grid min-h-[170px] place-items-center text-muted"
      role="status"
      aria-label={label}
    >
      <div
        className="relative grid h-[150px] w-[76px] place-items-center"
        aria-hidden="true"
      >
        <div className="relative z-[1] size-[60px] animate-loader-bounce-ball rounded-full [transform-style:preserve-3d] [transform:translateY(-70px)] before:absolute before:-inset-x-1.5 before:-inset-y-[3px] before:rounded-full before:border-2 before:border-neutral-700 before:bg-[radial-gradient(circle_at_36px_20px,var(--color-orange-500),var(--color-orange-800))] before:[transform:translateZ(1vmin)] before:content-['']">
          <div className="absolute size-full animate-loader-rotate-ball rounded-full [transform-style:preserve-3d]">
            <div
              className={`${LINE} after:[transform:rotate3d(1,0,0,90deg)]`}
            />
            <div
              className={`${LINE} before:[transform:rotate3d(0,0,0,2deg)] after:[transform:rotate3d(1,0,0,88deg)]`}
            />
            <div
              className={`${OVAL} before:[transform:rotate3d(1,0,0,45deg)_translate3d(0,0,6px)] after:[transform:rotate3d(1,0,0,-45deg)_translate3d(0,0,-6px)]`}
            />
            <div
              className={`${OVAL} before:[transform:rotate3d(1,0,0,135deg)_translate3d(0,0,-6px)] after:[transform:rotate3d(1,0,0,-135deg)_translate3d(0,0,6px)]`}
            />
          </div>
        </div>
        <div className="absolute bottom-1 h-1.5 w-[54px] animate-loader-bounce-shadow rounded-full bg-black blur-[2px] [transform:translateY(73px)]" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
