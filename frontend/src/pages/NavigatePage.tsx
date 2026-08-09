import { RoutePanel } from "../components/Controls/RoutePanel";
import { PanelHeader } from "../components/Layout/PanelHeader";

// Navigate tab: search-based A/B route planning + turn-by-turn directions (spec 3.1, 3.3).
export function NavigatePage() {
  return (
    <div className="page page-navigate">
      <PanelHeader title="Navigate" />
      <RoutePanel />
    </div>
  );
}
