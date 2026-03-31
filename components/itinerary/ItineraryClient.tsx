"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import {
  type ItineraryDay,
  type ItineraryItem,
  type Accommodation,
  FAMILIES,
  LITHUANIAN_CITIES,
} from "@/lib/types";
import { updateDay } from "@/app/actions/itinerary";
import FamilySection from "./FamilySection";
import DayItemRow from "./DayItemRow";
import AddItemForm from "./AddItemForm";

const DayMapWrapper = dynamic(() => import("@/components/map/DayMapWrapper"), {
  ssr: false,
  loading: () => (
    <div className="h-56 bg-gray-100 rounded-xl flex items-center justify-center text-sm text-gray-400">
      Loading map…
    </div>
  ),
});

const CITY_THEME: Record<string, { bar: string; badge: string; badgeText: string }> = {
  Vilnius:  { bar: "bg-amber-500",  badge: "bg-amber-100",  badgeText: "text-amber-700"  },
  Kaunas:   { bar: "bg-blue-500",   badge: "bg-blue-100",   badgeText: "text-blue-700"   },
  Trakai:   { bar: "bg-green-600",  badge: "bg-green-100",  badgeText: "text-green-700"  },
  Klaipeda: { bar: "bg-purple-500", badge: "bg-purple-100", badgeText: "text-purple-700" },
  Siauliai: { bar: "bg-orange-500", badge: "bg-orange-100", badgeText: "text-orange-700" },
  Palanga:  { bar: "bg-cyan-500",   badge: "bg-cyan-100",   badgeText: "text-cyan-700"   },
  Other:    { bar: "bg-gray-400",   badge: "bg-gray-100",   badgeText: "text-gray-600"   },
};
const DEFAULT_THEME = { bar: "bg-gray-200", badge: "bg-gray-100", badgeText: "text-gray-500" };

function formatWeekday(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(y, m - 1, day));
}
function formatDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(y, m - 1, day));
}
function formatLongDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(y, m - 1, day));
}

function getDayNumber(dateStr: string) {
  const start = new Date(2025, 6, 31);
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - start.getTime()) / 86400000) + 1;
}

interface Props {
  days: ItineraryDay[];
  items: ItineraryItem[];
  hotels: Accommodation[];
}

export default function ItineraryClient({ days, items, hotels }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const selectedDay = days.find((d) => d.trip_date === selectedDate) ?? null;
  const selectedItems = selectedDay ? items.filter((i) => i.day_id === selectedDay.id) : [];
  const hotelsForDay = selectedDay
    ? hotels.filter((h) => h.check_in <= selectedDay.trip_date && h.check_out > selectedDay.trip_date)
    : [];
  const sharedItems = selectedItems.filter((i) => !i.family_group || i.family_group === "all");

  function select(date: string) {
    if (selectedDate === date) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
      setEditing(false);
    }
  }

  async function handleUpdateDay(formData: FormData) {
    await updateDay(selectedDay!.id, formData);
    setEditing(false);
  }

  return (
    <div className="space-y-4">
      {/* ── Tile grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {days.map((day) => {
          const theme = day.city ? (CITY_THEME[day.city] ?? DEFAULT_THEME) : DEFAULT_THEME;
          const isSelected = selectedDate === day.trip_date;
          const dayItems = items.filter((i) => i.day_id === day.id);

          return (
            <button
              key={day.id}
              onClick={() => select(day.trip_date)}
              className={`text-left rounded-2xl overflow-hidden shadow-sm transition-all duration-150 focus:outline-none
                ${isSelected
                  ? "ring-2 ring-amber-400 shadow-lg scale-[1.02]"
                  : "hover:shadow-md hover:scale-[1.01]"
                }`}
            >
              {/* Color bar */}
              <div className={`${theme.bar} px-5 py-3 flex items-center justify-between`}>
                <span className="text-white text-sm font-bold uppercase tracking-widest opacity-90">
                  Day {getDayNumber(day.trip_date)}
                </span>
                {dayItems.length > 0 && (
                  <span className="text-white text-xs opacity-70">
                    {dayItems.length} item{dayItems.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Tile body */}
              <div className="bg-white px-5 py-4 min-h-[140px] flex flex-col gap-1.5">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{formatWeekday(day.trip_date)}</p>
                <p className="text-2xl font-bold text-gray-900 leading-tight">
                  {formatDate(day.trip_date)}
                </p>
                {day.city ? (
                  <span className={`self-start text-xs font-medium px-2.5 py-0.5 rounded-full ${theme.badge} ${theme.badgeText}`}>
                    {day.city}
                  </span>
                ) : (
                  <span className="text-xs text-gray-300 italic">No city set</span>
                )}
                {day.summary && (
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{day.summary}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Expanded panel ── */}
      {selectedDay && (
        <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-lg overflow-hidden">
          {/* Panel header */}
          <div className={`${selectedDay.city ? (CITY_THEME[selectedDay.city]?.bar ?? "bg-gray-400") : "bg-gray-400"} px-6 py-4 flex items-center justify-between`}>
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest opacity-80">
                Day {getDayNumber(selectedDay.trip_date)}
              </p>
              <h2 className="text-white text-2xl font-bold">{formatLongDate(selectedDay.trip_date)}</h2>
              {selectedDay.city && (
                <p className="text-white text-sm opacity-80 mt-0.5">{selectedDay.city}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-white opacity-70 hover:opacity-100 transition-opacity p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Edit/summary bar */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
            {editing ? (
              <form ref={formRef} action={handleUpdateDay} className="flex flex-col sm:flex-row gap-2 flex-1">
                <input type="hidden" name="trip_date" value={selectedDay.trip_date} />
                <select name="city" defaultValue={selectedDay.city ?? ""} className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="">City…</option>
                  {LITHUANIAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="text" name="label" defaultValue={selectedDay.label ?? ""} placeholder="Label (optional)" className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-36" />
                <input type="text" name="summary" defaultValue={selectedDay.summary ?? ""} placeholder="Day summary…" className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 flex-1 min-w-0" />
                <div className="flex gap-2 shrink-0">
                  <button type="submit" className="px-3 py-1 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-600">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="px-3 py-1 text-gray-500 rounded text-xs hover:bg-gray-100">Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <p className="text-sm text-gray-500 flex-1 min-w-0">
                  {selectedDay.summary
                    ? selectedDay.summary
                    : <span className="italic text-gray-300">No summary yet</span>}
                </p>
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-gray-400 hover:text-amber-600 flex items-center gap-1 shrink-0 px-2 py-1 rounded hover:bg-amber-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit day
                </button>
              </>
            )}
          </div>

          <div className="p-6 space-y-6">
            <DayMapWrapper hotels={hotelsForDay} />

            {/* For Everyone */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">For Everyone</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Shared activities &amp; group plans</p>
                </div>
                {sharedItems.length > 0 && (
                  <span className="text-xs text-gray-400">{sharedItems.length} item{sharedItems.length !== 1 ? "s" : ""}</span>
                )}
              </div>
              <div className="px-4 py-3">
                {sharedItems.length === 0
                  ? <p className="text-sm text-gray-400 italic mb-2">Nothing planned for the whole group yet</p>
                  : (
                    <div className="divide-y divide-gray-100 mb-2">
                      {sharedItems
                        .sort((a, b) => {
                          if (a.time_slot && b.time_slot) return a.time_slot.localeCompare(b.time_slot);
                          if (a.time_slot) return -1;
                          if (b.time_slot) return 1;
                          return a.sort_order - b.sort_order;
                        })
                        .map((item) => <DayItemRow key={item.id} item={item} />)}
                    </div>
                  )
                }
                <AddItemForm dayId={selectedDay.id} familyGroup={null} label="shared activity" />
              </div>
            </div>

            {/* Family sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {FAMILIES.map((family) => (
                <FamilySection
                  key={family.key}
                  familyKey={family.key}
                  dayId={selectedDay.id}
                  dayDate={selectedDay.trip_date}
                  items={selectedItems.filter((i) => i.family_group === family.key)}
                  hotel={hotelsForDay.find((h) => h.family_group === family.key) ?? null}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
