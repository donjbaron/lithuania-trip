"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  type ItineraryDay,
  type ItineraryItem,
  type Accommodation,
  type WishlistItem,
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
  const start = new Date(2026, 6, 31);
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - start.getTime()) / 86400000) + 1;
}

const FAMILY_INTEREST: Record<string, keyof WishlistItem> = {
  family1: "interested_family1",
  family2: "interested_family2",
  family3: "interested_family3",
};

interface Props {
  days: ItineraryDay[];
  items: ItineraryItem[];
  hotels: Accommodation[];
  activities: WishlistItem[];
}

type ItinerarySlot =
  | { type: "meal"; label: string; time: string }
  | { type: "activity"; activity: WishlistItem; time: string };

function geoDistance(a: WishlistItem, b: WishlistItem) {
  const dlat = (a.lat ?? 0) - (b.lat ?? 0);
  const dlng = (a.lng ?? 0) - (b.lng ?? 0);
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

function nearestNeighborSort(items: WishlistItem[]): WishlistItem[] {
  if (items.length <= 1) return items;
  const remaining = [...items];
  const result: WishlistItem[] = [remaining.splice(0, 1)[0]];
  while (remaining.length > 0) {
    const last = result[result.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = geoDistance(last, remaining[i]);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }
    result.push(remaining.splice(nearestIdx, 1)[0]);
  }
  return result;
}

function minsToTime(totalMins: number) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// Vilnius-area sunset times for each trip day (Lithuania summer, UTC+3)
const SUNSET: Record<string, string> = {
  "2026-07-31": "9:10 PM",
  "2026-08-01": "9:07 PM",
  "2026-08-02": "9:04 PM",
  "2026-08-03": "9:00 PM",
  "2026-08-04": "8:56 PM", // Palanga coast — slightly west, similar time
  "2026-08-05": "8:52 PM",
  "2026-08-06": "8:48 PM",
};

export default function ItineraryClient({ days, items, hotels, activities }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<number>>(new Set());
  const [itinerarySuggested, setItinerarySuggested] = useState(false);
  const [itinerarySlots, setItinerarySlots] = useState<ItinerarySlot[]>([]);
  const [routeIds, setRouteIds] = useState<number[]>([]);
  const [busySuggestion, setBusySuggestion] = useState<{ excess: WishlistItem[]; nextDay: ItineraryDay | null } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedDay = days.find((d) => d.trip_date === selectedDate) ?? null;
  const selectedItems = selectedDay ? items.filter((i) => i.day_id === selectedDay.id) : [];
  const activitiesForDay = selectedDay
    ? activities.filter((a) => a.activity_date === selectedDay.trip_date)
    : [];
  const hotelsForDay = selectedDay
    ? hotels.filter((h) => h.check_in <= selectedDay.trip_date && h.check_out > selectedDay.trip_date)
    : [];
  const sharedItems = selectedItems.filter((i) => !i.family_group || i.family_group === "all");
  const mappedActivities = activitiesForDay.filter((a) => selectedActivityIds.has(a.id));

  // Reset selection and scroll panel into view when switching days
  useEffect(() => {
    setSelectedActivityIds(new Set());
    setItinerarySuggested(false);
    setItinerarySlots([]);
    setRouteIds([]);
    setBusySuggestion(null);
    if (selectedDate && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedDate]);

  function suggestItinerary() {
    if (itinerarySuggested) {
      setItinerarySuggested(false);
      setItinerarySlots([]);
      setRouteIds([]);
      setSelectedActivityIds(new Set());
      setBusySuggestion(null);
      return;
    }

    const isArrivalDay = selectedDay?.trip_date === "2026-07-31";

    // Separate fixed-time from flexible activities
    const fixed = activitiesForDay.filter((a) => a.time_slot);
    const flexible = activitiesForDay.filter((a) => !a.time_slot);

    // Sort flexible by nearest-neighbor to minimize travel
    const withCoords = flexible.filter((a) => a.lat != null && a.lng != null);
    const withoutCoords = flexible.filter((a) => a.lat == null || a.lng == null);
    const sortedFlexible = [...nearestNeighborSort(withCoords), ...withoutCoords];

    // Build a flat list of all activities with assigned minutes
    const timed: { activity: WishlistItem; mins: number }[] = [];

    // Fixed-time activities always go at their stated time
    fixed.forEach((a) => {
      const [h, m] = a.time_slot!.split(":").map(Number);
      timed.push({ activity: a, mins: h * 60 + m });
    });

    if (isArrivalDay) {
      // Arrival day: find the latest arrival time from fixed activities, then add buffer.
      // Don't schedule flexible activities until everyone is settled.
      const lastArrivalMins = fixed.length > 0
        ? Math.max(...fixed.map((a) => { const [h, m] = a.time_slot!.split(":").map(Number); return h * 60 + m; }))
        : 16 * 60; // fallback to 4 PM if no arrival times set
      const startMins = lastArrivalMins + 90; // 90-min buffer to check in and settle
      sortedFlexible.forEach((a, i) => timed.push({ activity: a, mins: startMins + i * 75 }));
    } else {
      // Normal day: split morning / afternoon
      const half = Math.ceil(sortedFlexible.length / 2);
      const flexMorning = sortedFlexible.slice(0, half);
      const flexAfternoon = sortedFlexible.slice(half);
      flexMorning.forEach((a, i) => timed.push({ activity: a, mins: 10 * 60 + i * 90 }));
      flexAfternoon.forEach((a, i) => timed.push({ activity: a, mins: 14 * 60 + 30 + i * 90 }));
    }

    // Sort everything by time
    timed.sort((a, b) => a.mins - b.mins);

    // Build slots
    const slots: ItinerarySlot[] = [];
    const sunsetTime = SUNSET[selectedDay?.trip_date ?? ""] ?? null;

    if (!isArrivalDay) {
      slots.push({ type: "meal", label: "Breakfast", time: "9:00 AM" });
    }

    let lunchInserted = false;
    let sunsetInserted = false;

    for (const { activity, mins } of timed) {
      if (!isArrivalDay && !lunchInserted && mins >= 13 * 60) {
        slots.push({ type: "meal", label: "Lunch", time: "1:00 PM" });
        lunchInserted = true;
      }
      if (sunsetTime && !sunsetInserted && mins >= 21 * 60) {
        slots.push({ type: "meal", label: "Sunset", time: sunsetTime });
        sunsetInserted = true;
      }
      slots.push({ type: "activity", activity, time: minsToTime(mins) });
    }

    if (!isArrivalDay && !lunchInserted) {
      slots.push({ type: "meal", label: "Lunch", time: "1:00 PM" });
    }
    if (sunsetTime && !sunsetInserted) {
      slots.push({ type: "meal", label: "Sunset", time: sunsetTime });
    }

    // Detect busy days: more than 4 flexible activities is a lot for one day
    const TOO_BUSY = 4;
    if (sortedFlexible.length > TOO_BUSY) {
      const currentIdx = days.findIndex((d) => d.trip_date === selectedDay?.trip_date);
      const nextDay = currentIdx >= 0 && currentIdx < days.length - 1 ? days[currentIdx + 1] : null;
      setBusySuggestion({ excess: sortedFlexible.slice(TOO_BUSY), nextDay });
    } else {
      setBusySuggestion(null);
    }

    setItinerarySlots(slots);
    setRouteIds(timed.map((t) => t.activity.id));
    setSelectedActivityIds(new Set(timed.map((t) => t.activity.id)));
    setItinerarySuggested(true);
  }

  function toggleActivity(id: number) {
    setSelectedActivityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
          const dayActivities = activities.filter((a) => a.activity_date === day.trip_date);

          return (
            <div
              key={day.id}
              onClick={() => select(day.trip_date)}
              className={`cursor-pointer text-left rounded-2xl overflow-hidden shadow-sm transition-all duration-150
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
                {day.summary && (
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{day.summary}</p>
                )}
                {dayActivities.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {dayActivities.map((a) => (
                      <li key={a.id}>
                        {a.url ? (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 hover:underline group"
                          >
                            {a.image_url
                              ? <img src={a.image_url} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                              : <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            }
                            <span className="truncate">{a.title}</span>
                          </a>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-gray-500">
                            {a.image_url
                              ? <img src={a.image_url} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                              : <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            }
                            <span className="truncate">{a.title}</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Expanded panel ── */}
      {selectedDay && (
        <div ref={panelRef} className="bg-white rounded-2xl border-2 border-amber-300 shadow-lg overflow-hidden">
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
            <DayMapWrapper hotels={hotelsForDay} activities={mappedActivities} routeIds={routeIds} />

            {/* Activities from Activities tab */}
            {activitiesForDay.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 text-sm">Activities</h3>
                  <div className="flex items-center gap-3">
                    {!itinerarySuggested && (
                      <>
                        <span className="text-xs text-gray-400">
                          {selectedActivityIds.size > 0 ? `${selectedActivityIds.size} on map` : "click to map"}
                        </span>
                        {(() => {
                          const allSelected = activitiesForDay.every((a) => selectedActivityIds.has(a.id));
                          return (
                            <button
                              onClick={() => setSelectedActivityIds(allSelected ? new Set() : new Set(activitiesForDay.map((a) => a.id)))}
                              className="text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors"
                            >
                              {allSelected ? "Deselect all" : "Select all"}
                            </button>
                          );
                        })()}
                      </>
                    )}
                    <button
                      onClick={suggestItinerary}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                        itinerarySuggested
                          ? "bg-amber-500 text-white hover:bg-amber-600"
                          : "bg-gray-800 text-white hover:bg-gray-900"
                      }`}
                    >
                      {itinerarySuggested ? "Clear itinerary" : "Suggest itinerary"}
                    </button>
                  </div>
                </div>

                {itinerarySuggested && busySuggestion && (
                  <div className="mx-4 mt-3 mb-1 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-sm font-semibold text-yellow-800">
                      This day looks packed — consider spreading it out
                    </p>
                    <p className="text-xs text-yellow-700 mt-1 leading-relaxed">
                      <span className="font-medium">{busySuggestion.excess.map((a) => a.title).join(", ")}</span>
                      {busySuggestion.nextDay
                        ? ` could move to ${formatLongDate(busySuggestion.nextDay.trip_date)}`
                        : " could move to another day"}.
                    </p>
                  </div>
                )}
                {itinerarySuggested ? (
                  /* ── Suggested itinerary view ── */
                  <div className="divide-y divide-gray-100">
                    {itinerarySlots.map((slot, i) => {
                      if (slot.type === "meal") {
                        const isSunset = slot.label === "Sunset";
                        return (
                          <div key={i} className={`px-4 py-2 flex items-center gap-3 ${isSunset ? "bg-orange-50" : "bg-gray-50"}`}>
                            <span className={`text-xs font-bold w-16 shrink-0 ${isSunset ? "text-orange-400" : "text-gray-400"}`}>{slot.time}</span>
                            <span className={`text-xs font-semibold uppercase tracking-wide ${isSunset ? "text-orange-500" : "text-gray-500"}`}>
                              {isSunset ? "Sunset" : slot.label}
                            </span>
                          </div>
                        );
                      }
                      const { activity, time } = slot;
                      const interested = FAMILIES.filter((f) => activity[FAMILY_INTEREST[f.key]] as number);
                      return (
                        <div key={activity.id} className="px-4 py-3 flex items-center gap-3 bg-amber-50/40">
                          <span className="text-xs font-bold text-amber-600 w-16 shrink-0">{time}</span>
                          {activity.image_url && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                              <img src={activity.image_url} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{activity.title}</p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {activity.url && (
                                <a href={activity.url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-amber-600 hover:underline inline-flex items-center gap-1">
                                  More info
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                              )}
                              {activity.wiki_url && (
                                <a href={activity.wiki_url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1">
                                  Learn More
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                              )}
                            </div>
                          </div>
                          {interested.length > 0 && (
                            <div className="flex items-center gap-1 shrink-0">
                              {interested.map((f) => (
                                <div key={f.key} className="w-5 h-5 rounded-full overflow-hidden border border-white shadow-sm">
                                  <img src={`/families/${f.key}.png`} alt={f.label} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ── Normal activity list ── */
                  <div className="divide-y divide-gray-100">
                    {activitiesForDay.map((a) => {
                      const isPinned = selectedActivityIds.has(a.id);
                      const interested = FAMILIES.filter((f) => a[FAMILY_INTEREST[f.key]] as number);
                      return (
                        <div key={a.id} onClick={() => toggleActivity(a.id)}
                          className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${isPinned ? "bg-amber-50" : "hover:bg-gray-50"}`}
                        >
                          <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isPinned ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                          </div>
                          {a.image_url && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                              <img src={a.image_url} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${isPinned ? "text-amber-900" : "text-gray-800"}`}>{a.title}</p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {a.url && (
                                <a href={a.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-amber-600 hover:underline inline-flex items-center gap-1">
                                  More info
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                              )}
                              {a.wiki_url && (
                                <a href={a.wiki_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1">
                                  Learn More
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </a>
                              )}
                            </div>
                          </div>
                          {interested.length > 0 && (
                            <div className="flex items-center gap-1 shrink-0">
                              {interested.map((f) => (
                                <div key={f.key} className="w-5 h-5 rounded-full overflow-hidden border border-white shadow-sm">
                                  <img src={`/families/${f.key}.png`} alt={f.label} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Family hotel sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {FAMILIES.map((family) => (
                <FamilySection
                  key={family.key}
                  familyKey={family.key}
                  dayId={selectedDay.id}
                  dayDate={selectedDay.trip_date}
                  items={[]}
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
