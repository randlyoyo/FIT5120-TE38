import { BookOpen, Image as ImageIcon, MapPin, Navigation, Trees } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PanelHeader } from "../components/Layout/PanelHeader";
import { useAppState } from "../context/AppStateContext";
import { formatDistance, haversineMeters } from "../utils/geo";

const THEME_ICON: Record<string, typeof Trees> = { Library: BookOpen, Park: Trees, Gallery: ImageIcon };

// Quiet Spaces tab (spec 3.4): list view of parks/libraries/galleries as a non-map alternative,
// with a one-tap "navigate here" shortcut into the Navigate tab.
export function QuietSpacesPage() {
  const { quietSpaces, start, setEnd, focusOnPoint } = useAppState();
  const navigate = useNavigate();
  const [themeFilter, setThemeFilter] = useState<string | null>(null);

  const themes = useMemo(() => Array.from(new Set(quietSpaces.map((s) => s.theme))), [quietSpaces]);

  const sorted = useMemo(() => {
    const filtered = themeFilter ? quietSpaces.filter((s) => s.theme === themeFilter) : quietSpaces;
    if (!start) return filtered;
    return [...filtered].sort(
      (a, b) =>
        haversineMeters(start, { lat: a.latitude, lon: a.longitude }) -
        haversineMeters(start, { lat: b.latitude, lon: b.longitude })
    );
  }, [quietSpaces, themeFilter, start]);

  return (
    <div className="page page-list">
      <PanelHeader title="Quiet Spaces" />

      <div className="filter-chips">
        <button className={`chip ${!themeFilter ? "selected" : ""}`} onClick={() => setThemeFilter(null)}>
          All
        </button>
        {themes.map((t) => {
          const Icon = THEME_ICON[t] ?? Trees;
          return (
            <button key={t} className={`chip ${themeFilter === t ? "selected" : ""}`} onClick={() => setThemeFilter(t)}>
              <Icon size={13} /> {t}
            </button>
          );
        })}
      </div>

      {sorted.length === 0 && <p className="hint">No quiet spaces loaded yet.</p>}

      <ul className="place-list">
        {sorted.map((space) => {
          const Icon = THEME_ICON[space.theme] ?? Trees;
          return (
            <li key={space.id} className="place-list-item">
              <span className="place-list-icon">
                <Icon size={18} />
              </span>
              <div className="place-list-body">
                <div className="place-list-title">{space.featureName}</div>
                <div className="place-list-sub">
                  {space.theme}
                  {space.subTheme ? ` · ${space.subTheme}` : ""}
                  {space.address ? ` · ${space.address}` : ""}
                </div>
                {start && (
                  <div className="place-list-distance">
                    {formatDistance(haversineMeters(start, { lat: space.latitude, lon: space.longitude }))} away
                  </div>
                )}
              </div>
              <button
                className="secondary-button small"
                title="Show on map"
                aria-label={`Show ${space.featureName} on map`}
                onClick={() => {
                  focusOnPoint({ lat: space.latitude, lon: space.longitude });
                  navigate("/map");
                }}
              >
                <MapPin size={14} />
              </button>
              <button
                className="secondary-button small"
                title="Navigate here"
                aria-label={`Navigate to ${space.featureName}`}
                onClick={() => {
                  setEnd({ lat: space.latitude, lon: space.longitude }, space.featureName);
                  navigate("/navigate");
                }}
              >
                <Navigation size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
