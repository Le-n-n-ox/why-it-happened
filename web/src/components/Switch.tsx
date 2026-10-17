interface Props {
  checked: boolean;
  onChange: () => void;
  label: string;
}

export function Switch({ checked, onChange, label }: Props) {
  return (
    <label className="theme-switch">
      <input
        type="checkbox"
        className="theme-switch__checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
      />
      <span className="theme-switch__slider" aria-hidden="true" />
    </label>
  );
}
