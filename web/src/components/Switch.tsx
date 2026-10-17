interface Props {
  checked: boolean;
  onChange: () => void;
  label: string;
}

export function Switch({ checked, onChange, label }: Props) {
  return (
    <label className="relative ml-auto block h-6 w-[46px] flex-none cursor-pointer min-[901px]:[[data-collapsed=true]_&]:ml-0">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
        aria-label={label}
      />
      <span
        className="absolute inset-0 rounded-full border-2 border-line bg-surface-2 transition-[background,border-color] duration-200 before:absolute before:left-[3px] before:top-[3px] before:size-3.5 before:rounded-full before:bg-muted before:transition before:duration-200 before:content-[''] before:[box-shadow:inset_6px_-2px_0_var(--surface-2)] peer-checked:border-accent peer-checked:bg-accent peer-checked:before:translate-x-[22px] peer-checked:before:bg-accent-ink peer-checked:before:[box-shadow:none] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
        aria-hidden="true"
      />
    </label>
  );
}