import { Polyline, Popup } from "react-leaflet";
import type { DualRouteResult } from "../../types";

interface Props {
  routes: DualRouteResult | null;
}

// Draws the fastest (blue) vs quietest (green/orange by sensory level) route (spec 3.3).
export function RouteLayer({ routes }: Props) {
  if (!routes) return null;

  const fastestPositions = routes.fastest.geometry.coordinates.map(
    ([lon, lat]) => [lat, lon] as [number, number]
  );
  const quietestPositions = routes.quietest.geometry.coordinates.map(
    ([lon, lat]) => [lat, lon] as [number, number]
  );

  const quietColor = routes.quietest.sensoryLevel === "High" ? "#f97316" : "#16a34a";

  if (routes.identicalPaths) {
    return (
      <Polyline positions={fastestPositions} pathOptions={{ color: "#2563eb", weight: 8, opacity: 1, lineCap: "round", lineJoin: "round" }}>
        <Popup>
          Fastest route · {(routes.fastest.distanceMeters / 1000).toFixed(2)} km ·{" "}
          {Math.round(routes.fastest.durationSeconds / 60)} min
        </Popup>
      </Polyline>
    );
  }

  return (
    <>
      <Polyline
        positions={quietestPositions}
        pathOptions={{ color: quietColor, weight: 3, opacity: 0.95, dashArray: "8,8" }}
      >
        <Popup>
          Quietest route ({routes.quietest.sensoryLevel} sensory load) ·{" "}
          {(routes.quietest.distanceMeters / 1000).toFixed(2)} km ·{" "}
          {Math.round(routes.quietest.durationSeconds / 60)} min
        </Popup>
      </Polyline>

      <Polyline positions={fastestPositions} pathOptions={{ color: "#2563eb", weight: 8, opacity: 1, lineCap: "round", lineJoin: "round" }}>
        <Popup>
          Fastest route · {(routes.fastest.distanceMeters / 1000).toFixed(2)} km ·{" "}
          {Math.round(routes.fastest.durationSeconds / 60)} min
        </Popup>
      </Polyline>
    </>
  );
}
