import L from "leaflet";
import type { LucideIcon } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

interface BadgeOptions {
  background: string;
  size?: number;
  iconSize?: number;
  pulse?: boolean;
}

/** Renders a lucide icon into a small circular badge, used for every non-route map marker. */
export function createBadgeIcon(Icon: LucideIcon, { background, size = 30, iconSize = 15, pulse = false }: BadgeOptions): L.DivIcon {
  const iconMarkup = renderToStaticMarkup(
    createElement(Icon, { size: iconSize, color: "white", strokeWidth: 2.25 })
  );
  return new L.DivIcon({
    html: `<div class="map-badge" style="width:${size}px;height:${size}px;background:${background}">${iconMarkup}</div>`,
    className: `map-badge-wrapper${pulse ? " pulse" : ""}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Teardrop-style destination pin (point anchored at the bottom, like a dropped map pin). */
export function createPinIcon(Icon: LucideIcon, color: string, size = 34): L.DivIcon {
  const iconMarkup = renderToStaticMarkup(createElement(Icon, { size, color, strokeWidth: 2, fill: color, fillOpacity: 0.15 }));
  return new L.DivIcon({
    html: `<div class="map-pin">${iconMarkup}</div>`,
    className: "map-pin-wrapper",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

/** Simple "you are here" dot marker for the start point. */
export function createDotIcon(color: string, size = 18): L.DivIcon {
  return new L.DivIcon({
    html: `<div class="map-dot" style="width:${size}px;height:${size}px;background:${color}"></div>`,
    className: "map-dot-wrapper",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
