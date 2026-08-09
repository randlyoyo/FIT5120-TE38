interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

// Generic toggle switch, used for the heatmap on/off control (spec 3.2).
export function NoiseSwitch({ checked, onChange, label }: Props) {
  return (
    <label className="switch-row">
      <span>{label}</span>
      <span className={`switch ${checked ? "on" : ""}`} onClick={() => onChange(!checked)}>
        <span className="switch-knob" />
      </span>
    </label>
  );
}
