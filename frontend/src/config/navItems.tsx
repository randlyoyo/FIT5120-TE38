import { Bell, Info, Map, Navigation, Trees } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof Map;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Map", icon: Map, end: true },
  { to: "/navigate", label: "Navigate", icon: Navigation },
  { to: "/quiet-spaces", label: "Quiet Spaces", icon: Trees },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/about", label: "About", icon: Info },
];
