"use client";

import { useState, useEffect, useRef } from "react";
import { saveHotelFromSearch } from "@/app/actions/accommodations";
import type { FamilyGroup } from "@/lib/types";

interface NominatimResult {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

interface Props {
  familyKey: FamilyGroup;
  existingId?: number;
  onDone: () => void;
  onCancel: () => void;
}

function formatAddress(result: NominatimResult): string {
  const a = result.address;
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const city = a.city ?? a.town ?? a.village ?? a.county ?? "";
  return [street, city].filter(Boolean).join(", ");
}

function extractCity(result: NominatimResult): string {
  const a = result.address;
  return a.city ?? a.town ?? a.village ?? a.county ?? a.state ?? "";
}

export default function HotelSearch({ familyKey, existingId, onDone, onCancel }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + " Lithuania")}&format=json&addressdetails=1&limit=6`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "en" },
        });
        const data: NominatimResult[] = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSelect(result: NominatimResult) {
    const name = result.name || result.display_name.split(",")[0];
    const address = formatAddress(result);
    const city = extractCity(result);
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    setSaving(true);
    setResults([]);
    setQuery("");
    await saveHotelFromSearch(familyKey, name, address, city, lat, lng, existingId);
    setSaving(false);
    onDone();
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={saving ? "Saving…" : "Search for a hotel…"}
          disabled={saving}
          autoFocus
          className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white disabled:opacity-50"
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto text-xs">
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                type="button"
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors"
              >
                <span className="font-medium text-gray-800 block truncate">
                  {r.name || r.display_name.split(",")[0]}
                </span>
                <span className="text-gray-400 block truncate">{formatAddress(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="mt-1.5 text-xs text-gray-400 hover:text-gray-600"
      >
        Cancel
      </button>
    </div>
  );
}
