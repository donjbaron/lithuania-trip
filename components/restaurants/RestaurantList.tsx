"use client";

import { useState } from "react";
import { type Restaurant } from "@/lib/types";
import { FAMILIES } from "@/lib/types";
import { updateRestaurant, deleteRestaurant, toggleRestaurantInterest } from "@/app/actions/restaurants";

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

const MEAL_COLORS: Record<string, string> = {
  lunch: "bg-amber-100 text-amber-700",
  dinner: "bg-indigo-100 text-indigo-700",
};

const FAMILY_INTEREST: Record<string, keyof Restaurant> = {
  family1: "interested_family1",
  family2: "interested_family2",
  family3: "interested_family3",
};

function RestaurantRow({ item }: { item: Restaurant }) {
  const [editing, setEditing] = useState(false);

  async function handleUpdate(formData: FormData) {
    await updateRestaurant(item.id, formData);
    setEditing(false);
  }

  if (editing) {
    return (
      <form action={handleUpdate} className="px-4 py-3 space-y-2 bg-amber-50/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2">
            <input type="text" name="name" defaultValue={item.name} required placeholder="Restaurant name"
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <select name="city" defaultValue={item.city ?? ""}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="">Any city</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="meal_type" defaultValue={item.meal_type ?? ""}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="">Lunch or Dinner</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
          <select name="activity_date" defaultValue={item.activity_date ?? ""}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="">Any day</option>
            {TRIP_DATES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <input type="url" name="url" defaultValue={item.url ?? ""} placeholder="URL"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <input type="text" name="address" defaultValue={item.address ?? ""} placeholder="Address"
            className="sm:col-span-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <input type="text" name="cuisine" defaultValue={item.cuisine ?? ""} placeholder="Cuisine (e.g. Lithuanian, Italian…)"
            className="sm:col-span-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <textarea name="notes" defaultValue={item.notes ?? ""} placeholder="Notes"
            className="sm:col-span-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" rows={2} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600">Save</button>
          <button type="button" onClick={() => setEditing(false)} className="px-3 py-1 text-gray-500 rounded-lg text-xs hover:bg-gray-100">Cancel</button>
        </div>
      </form>
    );
  }

  const interested = FAMILIES.filter((f) => item[FAMILY_INTEREST[f.key]] as number);

  return (
    <div className="flex divide-x divide-gray-100">
      {item.image_url && (
        <div className="w-24 shrink-0">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex-1 min-w-0 px-4 py-3 space-y-2">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-800">{item.name}</p>
              {item.meal_type && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${MEAL_COLORS[item.meal_type]}`}>
                  {item.meal_type.charAt(0).toUpperCase() + item.meal_type.slice(1)}
                </span>
              )}
              {item.city && (
                <span className="text-xs text-gray-400">{item.city}</span>
              )}
            </div>
            {item.cuisine && <p className="text-xs text-indigo-600 font-medium mt-0.5">{item.cuisine}</p>}
            {item.address && <p className="text-xs text-gray-400 mt-0.5">{item.address}</p>}
            {item.notes && <p className="text-xs text-gray-500 mt-0.5 italic">{item.notes}</p>}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-amber-600 hover:underline inline-flex items-center gap-1">
                  More info
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setEditing(true)}
              className="p-1.5 text-gray-400 hover:text-amber-600 rounded hover:bg-amber-50">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button onClick={() => deleteRestaurant(item.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Who's interested */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Interested:</span>
          <div className="flex items-center gap-1">
            {FAMILIES.map((f) => {
              const on = item[FAMILY_INTEREST[f.key]] as number;
              return (
                <button key={f.key}
                  onClick={() => toggleRestaurantInterest(item.id, f.key as "family1" | "family2" | "family3", on)}
                  className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-all ${on ? "border-amber-400 opacity-100" : "border-transparent opacity-30 grayscale"}`}
                  title={f.label}>
                  <img src={`/families/${f.key}.png`} alt={f.label} className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>
          {interested.length > 0 && (
            <span className="text-xs text-gray-400">{interested.map(f => f.label).join(", ")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Group by city, then by meal type within city
export default function RestaurantList({ items }: { items: Restaurant[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 italic">No restaurants added yet.</p>;
  }

  const cities = [...new Set(items.map(r => r.city ?? "Other"))].sort();

  return (
    <div className="space-y-6">
      {cities.map((city) => {
        const cityItems = items.filter(r => (r.city ?? "Other") === city);
        const lunch = cityItems.filter(r => r.meal_type === "lunch");
        const dinner = cityItems.filter(r => r.meal_type === "dinner");
        const any = cityItems.filter(r => !r.meal_type);

        return (
          <div key={city} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">{city}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { label: "Lunch", rows: lunch },
                { label: "Dinner", rows: dinner },
                { label: "Either", rows: any },
              ].map(({ label, rows }) =>
                rows.length > 0 ? (
                  <div key={label}>
                    <div className="px-4 py-1.5 bg-gray-50/50">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {rows.map(r => <RestaurantRow key={r.id} item={r} />)}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
