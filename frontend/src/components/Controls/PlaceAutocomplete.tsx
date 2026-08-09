import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { searchPlaces } from "../../services/geocode";
import type { LatLon, PlaceSuggestion } from "../../types";

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSelect: (point: LatLon, label: string) => void;
  placeholder: string;
}

// Search-as-you-type place lookup with a results dropdown, like a real map app's search box.
export function PlaceAutocomplete({ value, onChange, onSelect, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value.trim() || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(() => {
      searchPlaces(value)
        .then((results) => {
          if (id === requestId.current) {
            setSuggestions(results);
            setOpen(true);
          }
        })
        .finally(() => {
          if (id === requestId.current) setLoading(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="place-autocomplete" ref={containerRef}>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {loading && <span className="autocomplete-spinner" />}
      {open && suggestions.length > 0 && (
        <ul className="autocomplete-dropdown">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onClick={() => {
                onSelect({ lat: s.lat, lon: s.lon }, s.label);
                setOpen(false);
              }}
            >
              <MapPin size={14} className="autocomplete-pin" />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
