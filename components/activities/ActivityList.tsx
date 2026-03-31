"use client";

import { useState } from "react";
import Image from "next/image";
import { FAMILIES, type WishlistItem } from "@/lib/types";
import { deleteActivity, toggleInterest, updateActivity } from "@/app/actions/activities";

const CITIES = ["Vilnius", "Kaunas", "Palanga"];
const TRIP_DATES = [
  { value: "2025-07-31", label: "Thu Jul 31 — Day 1" },
  { value: "2025-08-01", label: "Fri Aug 1 — Day 2" },
  { value: "2025-08-02", label: "Sat Aug 2 — Day 3" },
  { value: "2025-08-03", label: "Sun Aug 3 — Day 4" },
  { value: "2025-08-04", label: "Mon Aug 4 — Day 5" },
  { value: "2025-08-05", label: "Tue Aug 5 — Day 6" },
  { value: "2025-08-06", label: "Wed Aug 6 — Day 7" },
];

const CITY_BADGE: Record<string, string> = {
  Vilnius: "bg-amber-100 text-amber-700",
  Kaunas:  "bg-blue-100 text-blue-700",
  Palanga: "bg-cyan-100 text-cyan-700",
};

function formatDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(
    new Date(y, m - 1, day)
  );
}

function InterestVote({ item, familyKey, current }: {
  item: WishlistItem;
  familyKey: "family1" | "family2" | "family3";
  current: number;
}) {
  const family = FAMILIES.find((f) => f.key === familyKey)!;
  const headerColors: Record<string, string> = {
    family1: "bg-amber-500",
    family2: "bg-blue-500",
    family3: "bg-green-600",
  };
  const activeColors: Record<string, string> = {
    family1: "bg-amber-50 border-amber-400 text-amber-700",
    family2: "bg-blue-50 border-blue-400 text-blue-700",
    family3: "bg-green-50 border-green-500 text-green-700",
  };

  return (
    <form action={toggleInterest.bind(null, item.id, familyKey, current)}>
      <button
        type="submit"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
          current
            ? activeColors[familyKey]
            : "bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
        }`}
      >
        <div className={`w-5 h-5 rounded-full overflow-hidden shrink-0 ring-1 ${current ? "ring-current" : "ring-gray-300"}`}>
          <Image src={`/families/${familyKey}.png`} unoptimized alt={family.label} width={20} height={20} className="w-full h-full object-cover" />
        </div>
        <span>{family.label}</span>
        {current
          ? <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
          : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
        }
      </button>
    </form>
  );
}

function ActivityRow({ item }: { item: WishlistItem }) {
  const [editing, setEditing] = useState(false);

  async function handleUpdate(formData: FormData) {
    await updateActivity(item.id, formData);
    setEditing(false);
  }

  if (editing) {
    return (
      <form action={handleUpdate} className="px-4 py-3 space-y-2 bg-amber-50/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2">
            <input
              type="text"
              name="name"
              defaultValue={item.title}
              required
              placeholder="Name"
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <select name="city" defaultValue={item.city ?? ""} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="">Any city</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="activity_date" defaultValue={item.activity_date ?? ""} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="">Any day</option>
            {TRIP_DATES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <input type="url" name="url" defaultValue={item.url ?? ""} placeholder="URL" className="sm:col-span-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600">Save</button>
          <button type="button" onClick={() => setEditing(false)} className="px-3 py-1 text-gray-500 rounded-lg text-xs hover:bg-gray-100">Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className="px-4 py-3 space-y-2">
      {/* Top row: name + badges + actions */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-800">{item.title}</p>
            {item.city && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CITY_BADGE[item.city] ?? "bg-gray-100 text-gray-500"}`}>
                {item.city}
              </span>
            )}
            {item.activity_date && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {formatDate(item.activity_date)}
              </span>
            )}
          </div>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-amber-600 hover:underline mt-0.5 inline-flex items-center gap-1">
              More info
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
        <button onClick={() => setEditing(true)} className="p-1 text-gray-300 hover:text-amber-500 transition-colors rounded shrink-0" title="Edit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <form action={deleteActivity.bind(null, item.id)} className="shrink-0">
          <button type="submit" className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded" title="Delete">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </form>
      </div>

      {/* Vote row */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-400 self-center mr-1">Who&apos;s in?</span>
        <InterestVote item={item} familyKey="family1" current={item.interested_family1} />
        <InterestVote item={item} familyKey="family2" current={item.interested_family2} />
        <InterestVote item={item} familyKey="family3" current={item.interested_family3} />
      </div>
    </div>
  );
}

export default function ActivityList({ items }: { items: WishlistItem[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-base">No activities yet</p>
        <p className="text-sm mt-1">Add something to do below</p>
      </div>
    );
  }

  const cities = ["Vilnius", "Kaunas", "Palanga", null];
  const grouped = cities
    .map((city) => ({
      city,
      activities: items.filter((i) => (city === null ? !i.city : i.city === city)),
    }))
    .filter((g) => g.activities.length > 0);

  return (
    <div className="space-y-6">
      {grouped.map(({ city, activities }) => (
        <div key={city ?? "other"}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${city ? (CITY_BADGE[city] ?? "bg-gray-100 text-gray-600") : "bg-gray-100 text-gray-500"}`}>
              {city ?? "Any city"}
            </span>
            <span className="text-xs text-gray-400">
              {activities.length} activit{activities.length !== 1 ? "ies" : "y"}
            </span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
            {activities.map((item) => <ActivityRow key={item.id} item={item} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
