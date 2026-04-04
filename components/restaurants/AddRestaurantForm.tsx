"use client";

import { useRef, useState } from "react";
import { addRestaurant } from "@/app/actions/restaurants";

const CITIES = ["Vilnius", "Kaunas", "Trakai", "Palanga", "Other"];
const TRIP_DATES = [
  { value: "2026-07-31", label: "Fri Jul 31 — Day 1" },
  { value: "2026-08-01", label: "Sat Aug 1 — Day 2" },
  { value: "2026-08-02", label: "Sun Aug 2 — Day 3" },
  { value: "2026-08-03", label: "Mon Aug 3 — Day 4" },
  { value: "2026-08-04", label: "Tue Aug 4 — Day 5" },
  { value: "2026-08-05", label: "Wed Aug 5 — Day 6" },
  { value: "2026-08-06", label: "Thu Aug 6 — Day 7" },
];

// Shared Maps loader — deduplicates script injection
function loadGoogleMapsWithPlaces(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.google?.maps?.places) return Promise.resolve();
  if (w._gmapsLoading) return w._gmapsLoading;
  w._gmapsLoading = new Promise<void>((resolve) => {
    const existing = document.querySelector("script[src*='maps.googleapis.com']");
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return w._gmapsLoading;
}

interface PlaceResult {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  url: string;
}

export default function AddRestaurantForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [filled, setFilled] = useState<Partial<PlaceResult>>({});

  async function handleSubmit(formData: FormData) {
    await addRestaurant(formData);
    formRef.current?.reset();
    setFilled({});
    setResults([]);
  }

  async function handleSearch() {
    const query = nameRef.current?.value?.trim();
    if (!query) return;
    setSearching(true);
    setResults([]);
    try {
      await loadGoogleMapsWithPlaces();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google;
      const service = new g.maps.places.PlacesService(document.createElement("div"));
      service.textSearch(
        { query: `${query} restaurant Lithuania`, type: "restaurant" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (places: any[], status: string) => {
          if (status === g.maps.places.PlacesServiceStatus.OK && places?.length) {
            setResults(
              places.slice(0, 5).map((p: any) => ({
                name: p.name,
                address: p.formatted_address ?? "",
                lat: p.geometry?.location?.lat() ?? null,
                lng: p.geometry?.location?.lng() ?? null,
                url: p.website ?? "",
              }))
            );
          }
          setSearching(false);
        }
      );
    } catch {
      setSearching(false);
    }
  }

  function applyResult(r: PlaceResult) {
    setFilled(r);
    setResults([]);
    if (nameRef.current) nameRef.current.value = r.name;
  }

  return (
    <form ref={formRef} action={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Add Restaurant</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Name + search */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <input ref={nameRef} type="text" name="name" required
              placeholder="e.g. Etno Dvaras, Bernelių Užeiga…"
              defaultValue={filled.name ?? ""}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <button type="button" onClick={handleSearch} disabled={searching}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50 shrink-0 flex items-center gap-1.5 transition-colors">
              {searching
                ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"/></svg>
              }
              Search
            </button>
          </div>

          {/* Search results dropdown */}
          {results.length > 0 && (
            <div className="mt-1 border border-gray-200 rounded-lg shadow-lg bg-white divide-y divide-gray-100 z-10 relative">
              {results.map((r, i) => (
                <button key={i} type="button" onClick={() => applyResult(r)}
                  className="w-full text-left px-3 py-2.5 hover:bg-amber-50 transition-colors">
                  <p className="text-sm font-medium text-gray-800">{r.name}</p>
                  <p className="text-xs text-gray-500">{r.address}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
          <select name="city"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="">Any city</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Meal</label>
          <select name="meal_type"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="">Lunch or Dinner</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Day <span className="text-gray-300">(optional)</span></label>
          <select name="activity_date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="">Any day</option>
            {TRIP_DATES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
          <input type="url" name="url" placeholder="https://…"
            defaultValue={filled.url ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
          <input type="text" name="address" placeholder="Street address"
            defaultValue={filled.address ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes <span className="text-gray-300">(optional)</span></label>
          <textarea name="notes" placeholder="e.g. Great cepelinai, need reservation…" rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
        </div>

        {/* Hidden lat/lng populated by search */}
        <input type="hidden" name="lat" value={filled.lat ?? ""} />
        <input type="hidden" name="lng" value={filled.lng ?? ""} />
      </div>

      <button type="submit"
        className="mt-4 px-5 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
        Add Restaurant
      </button>
    </form>
  );
}
