interface Props {
  checked: boolean;
  onChange: () => void;
  label: string;
}

// The two lit/pressed shadows are written out in full so Tailwind can see every class.
const LIT = "[box-shadow:inset_0_0_2px_hsl(var(--switch-hue)_20%_15%_/_60%),inset_0_0_3px_2px_hsl(var(--switch-hue)_20%_15%_/_60%),inset_0_0_5px_2px_hsl(var(--switch-hue)_20%_45%_/_60%)]";
const DARK = "[box-shadow:inset_0_0_5px_hsl(var(--switch-hue)_20%_15%),inset_8px_8px_6px_hsl(var(--switch-hue)_20%_15%),inset_8px_8px_8px_hsl(var(--switch-hue)_20%_45%)]";
const LIT_ON = "group-has-[:checked]:[box-shadow:inset_0_0_2px_hsl(var(--switch-hue)_20%_15%_/_60%),inset_0_0_3px_2px_hsl(var(--switch-hue)_20%_15%_/_60%),inset_0_0_5px_2px_hsl(var(--switch-hue)_20%_45%_/_60%)]";
const DARK_ON = "group-has-[:checked]:[box-shadow:inset_0_0_5px_hsl(var(--switch-hue)_20%_15%),inset_8px_8px_6px_hsl(var(--switch-hue)_20%_15%),inset_8px_8px_8px_hsl(var(--switch-hue)_20%_45%)]";
const INDICATOR =
  "absolute top-[20%] h-[60%] w-[40%] transition-[box-shadow] duration-[600ms] ease-[cubic-bezier(1,0,1,1)]";

export function PowerSwitch({ checked, onChange, label }: Props) {
  return (
    <label className="group inline-flex cursor-pointer items-center gap-2 [--switch-accent:142deg] [--switch-hue:220deg]">
      <input
        className="peer sr-only"
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={`${label}: ${checked ? "on" : "off"}`}
      />
      <span
        className="relative block h-6 w-[58px] flex-none rounded-full [box-shadow:inset_4px_4px_5px_hsl(var(--switch-hue)_20%_80%),inset_-4px_-4px_5px_hsl(var(--switch-hue)_20%_93%)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-accent"
        aria-hidden="true"
      >
        {/* left lamp is dark while off, lit while on */}
        <span
          className={`${INDICATOR} left-[10%] overflow-hidden rounded-[100px_0_0_100px] bg-[linear-gradient(180deg,hsl(calc(var(--switch-accent)_+_20deg)_95%_80%)_10%,hsl(calc(var(--switch-accent)_+_20deg)_100%_60%)_30%,hsl(var(--switch-accent)_90%_50%)_60%,hsl(var(--switch-accent)_90%_60%)_75%,hsl(var(--switch-accent)_90%_50%))] ${DARK} ${LIT_ON}`}
        />
        {/* right lamp is lit while off, dark while on */}
        <span
          className={`${INDICATOR} right-[10%] rounded-[0_100px_100px_0] bg-[linear-gradient(180deg,hsl(var(--switch-hue)_20%_95%),hsl(var(--switch-hue)_20%_65%)_60%,hsl(var(--switch-hue)_20%_70%)_70%,hsl(var(--switch-hue)_20%_65%))] ${LIT} ${DARK_ON}`}
        />
        <span className="absolute left-[5%] top-[10%] z-[1] h-[80%] w-[55%] rounded-full bg-[linear-gradient(160deg,hsl(var(--switch-hue)_20%_95%)_40%,hsl(var(--switch-hue)_20%_65%)_70%)] transition-[left] duration-[600ms] ease-[cubic-bezier(1,0,1,1)] [box-shadow:2px_2px_3px_hsl(var(--switch-hue)_18%_50%_/_80%),4px_5px_7px_hsl(var(--switch-hue)_18%_50%_/_45%)] group-has-[:checked]:left-[40%] before:absolute before:left-[5%] before:top-[10%] before:h-[80%] before:w-[41%] before:rounded-full before:bg-[linear-gradient(-50deg,hsl(var(--switch-hue)_20%_95%)_20%,hsl(var(--switch-hue)_20%_85%)_80%)] before:content-[''] before:[box-shadow:inset_1px_1px_2px_hsl(var(--switch-hue)_20%_85%)] after:absolute after:right-[5%] after:top-[10%] after:h-[80%] after:w-[41%] after:rounded-full after:bg-[linear-gradient(-50deg,hsl(var(--switch-hue)_20%_95%)_20%,hsl(var(--switch-hue)_20%_75%)_80%)] after:content-[''] after:[box-shadow:inset_1px_1px_3px_hsl(var(--switch-hue)_20%_70%)]" />
      </span>
      <span className="whitespace-nowrap text-[.8rem] font-bold text-muted">
        {label}: {checked ? "on" : "off"}
      </span>
    </label>
  );
}