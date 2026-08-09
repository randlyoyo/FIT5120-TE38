import axios from "axios";
import type { PlaceSuggestion } from "../types";

// Melbourne CBD bounding box to bias/restrict Nominatim (OSM) geocoding results.
const MELBOURNE_VIEWBOX = "144.9490,-37.7990,144.9820,-37.8280";

/** Autocomplete-style place search (like a real map app's search box), bounded to Melbourne CBD. */
export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (!query.trim() || query.trim().length < 2) return [];
  const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: {
      q: query,
      format: "json",
      limit: 6,
      viewbox: MELBOURNE_VIEWBOX,
      bounded: 1,
      addressdetails: 1,
    },
  });
  if (!Array.isArray(data)) return [];
  return data.map((r: any) => ({
    label: r.display_name as string,
    lat: Number(r.lat),
    lon: Number(r.lon),
  }));
}
