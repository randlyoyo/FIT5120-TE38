import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../config/navItems";

// Mobile bottom tab bar - hidden on desktop widths via CSS (see NavRail).
export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}>
          <Icon size={20} strokeWidth={2} />
          <span className="bottom-nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
