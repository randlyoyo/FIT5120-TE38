import { Footprints } from "lucide-react";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../config/navItems";

// Desktop icon rail - hidden on mobile widths via CSS (see BottomNav). Labelled (not just
// icons + hover tooltips) so a first-time visitor can tell what each section is without
// guessing - "Navigate"/"Quiet Spaces"/"Alerts" as text immediately signals what the app does.
export function NavRail() {
  return (
    <nav className="nav-rail">
      <div className="nav-rail-brand">
        <div className="nav-rail-brand-icon" aria-hidden="true">
          <Footprints size={18} strokeWidth={2.25} />
        </div>
        <div className="nav-rail-brand-text">
          <span className="nav-rail-brand-title">ChillGo</span>
          <span className="nav-rail-brand-tagline">Calm walking routes</span>
        </div>
      </div>
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-rail-item ${isActive ? "active" : ""}`}>
          <Icon size={20} strokeWidth={2} />
          <span className="nav-rail-item-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
