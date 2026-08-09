import axios from "axios";
import type { LatLon } from "../types";

// Melbourne CBD bounding box to bias/restrict Nominatim (OSM) geocoding results.
const MELBOURNE_VIEWBOX = "144.9490,-37.7990,144.9820,-37.8280";

export async function geocodeAddress(query: string): Promise<LatLon | null> {
  if (!query.trim()) return null;
  const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: {
      q: `${query}, Melbourne VIC, Australia`,
      format: "json",
      limit: 1,
      viewbox: MELBOURNE_VIEWBOX,
      bounded: 1,
    },
  });
  if (!Array.isArray(data) || data.length === 0) return null;
  return { lat: Number(data[0].lat), lon: Number(data[0].lon) };
}
