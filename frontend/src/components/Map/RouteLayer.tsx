import { Polyline, Popup } from "react-leaflet";
import type { DualRouteResult } from "../../types";

interface Props {
  routes: DualRouteResult | null;
}

// Draws the fastest (blue) vs quietest (green) route (spec 3.3) - both lines share the same
// stroke style (weight, opacity, rounded caps/joins) so the only visual difference is color.
const ROUTE_LINE_STYLE = { weight: 8, opacity: 1, lineCap: "round" as const, lineJoin: "round" as const };
const FASTEST_COLOR = "#2563eb";
const QUIETEST_COLOR = "#16a34a";

export function RouteLayer({ routes }: Props) {
  if (!routes) return null;

  const fastestPositions = routes.fastest.geometry.coordinates.map(
    ([lon, lat]) => [lat, lon] as [number, number]
  );
  const quietestPositions = routes.quietest.geometry.coordinates.map(
    ([lon, lat]) => [lat, lon] as [number, number]
  );

  if (routes.identicalPaths) {
    return (
      <Polyline positions={fastestPositions} pathOptions={{ ...ROUTE_LINE_STYLE, color: FASTEST_COLOR }}>
        <Popup>
          Fastest route · {(routes.fastest.distanceMeters / 1000).toFixed(2)} km ·{" "}
          {Math.round(routes.fastest.durationSeconds / 60)} min · noise score {routes.fastest.noiseScore}
        </Popup>
      </Polyline>
    );
  }

  return (
    <>
      <Polyline positions={quietestPositions} pathOptions={{ ...ROUTE_LINE_STYLE, color: QUIETEST_COLOR }}>
        <Popup>
          Quietest route ({routes.quietest.sensoryLevel} sensory load, score {routes.quietest.noiseScore}) ·{" "}
          {(routes.quietest.distanceMeters / 1000).toFixed(2)} km ·{" "}
          {Math.round(routes.quietest.durationSeconds / 60)} min
        </Popup>
      </Polyline>

      <Polyline positions={fastestPositions} pathOptions={{ ...ROUTE_LINE_STYLE, color: FASTEST_COLOR }}>
        <Popup>
          Fastest route · {(routes.fastest.distanceMeters / 1000).toFixed(2)} km ·{" "}
          {Math.round(routes.fastest.durationSeconds / 60)} min · noise score {routes.fastest.noiseScore}
        </Popup>
      </Polyline>
    </>
  );
}
