import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  title: string;
}

// Shared header for every side/overlay panel: title + a close action back to the map.
export function PanelHeader({ title }: Props) {
  const navigate = useNavigate();
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      <button className="panel-close" onClick={() => navigate("/map")} aria-label="Close">
        <X size={18} />
      </button>
    </div>
  );
}
