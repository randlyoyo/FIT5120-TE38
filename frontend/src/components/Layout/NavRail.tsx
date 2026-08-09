import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../config/navItems";

// Desktop icon rail - hidden on mobile widths via CSS (see BottomNav).
export function NavRail() {
  return (
    <nav className="nav-rail">
      <div className="nav-rail-brand">SN</div>
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-rail-item ${isActive ? "active" : ""}`} title={label}>
          <Icon size={20} strokeWidth={2} />
        </NavLink>
      ))}
    </nav>
  );
}
