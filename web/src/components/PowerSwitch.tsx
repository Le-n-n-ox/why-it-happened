interface Props {
  checked: boolean;
  onChange: () => void;
  label: string;
}

export function PowerSwitch({ checked, onChange, label }: Props) {
  return (
    <label className="power-switch">
      <input
        className="power-switch__input"
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={`${label}: ${checked ? "on" : "off"}`}
      />
      <span className="power-switch__track" aria-hidden="true">
        <span className="power-switch__indicator power-switch__indicator--left" />
        <span className="power-switch__indicator power-switch__indicator--right" />
        <span className="power-switch__button" />
      </span>
      <span className="power-switch__label">{label}: {checked ? "on" : "off"}</span>
    </label>
  );
}
