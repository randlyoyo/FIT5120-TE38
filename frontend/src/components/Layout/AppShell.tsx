import { Outlet, useLocation } from "react-router-dom";
import { MapCanvas } from "../Map/MapCanvas";
import { BottomNav } from "./BottomNav";
import { NavRail } from "./NavRail";

// Responsive shell used by both breakpoints:
// - Desktop: icon rail + docked side panel + persistent map, side by side (like a desktop map app).
// - Mobile: bottom tab bar + the panel shown full-screen over the map (map-only when on "/").
export function AppShell() {
  const { pathname } = useLocation();
  const isMapOnly = pathname === "/";

  return (
    <div className="app-shell">
      <div className="workspace">
        <NavRail />
        <div className={`panel ${isMapOnly ? "panel-empty" : ""}`}>
          <Outlet />
        </div>
        <MapCanvas />
      </div>
      <BottomNav />
    </div>
  );
}
