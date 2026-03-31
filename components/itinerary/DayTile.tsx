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

function formatWeekday(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date(y, m - 1, d)
  );
}

function formatShortDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(new Date(y, m - 1, d));
}

const CITY_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  Vilnius:  { bg: "bg-amber-500",  text: "text-white",     accent: "bg-amber-600"  },
  Kaunas:   { bg: "bg-blue-500",   text: "text-white",     accent: "bg-blue-600"   },
  Trakai:   { bg: "bg-green-600",  text: "text-white",     accent: "bg-green-700"  },
  Klaipeda: { bg: "bg-purple-500", text: "text-white",     accent: "bg-purple-600" },
  Siauliai: { bg: "bg-orange-500", text: "text-white",     accent: "bg-orange-600" },
  Palanga:  { bg: "bg-cyan-500",   text: "text-white",     accent: "bg-cyan-600"   },
  Other:    { bg: "bg-gray-500",   text: "text-white",     accent: "bg-gray-600"   },
};

const DEFAULT_COLOR = { bg: "bg-gray-200", text: "text-gray-500", accent: "bg-gray-300" };

interface Props {
  day: ItineraryDay;
  dayNumber: number;
  items: ItineraryItem[];
  hotels: Accommodation[];
}

export default function DayTile({ day, dayNumber, items, hotels }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const hotelsForDay = hotels.filter(
    (h) => h.check_in <= day.trip_date && h.check_out > day.trip_date
  );
  const sharedItems = items.filter(
    (i) => !i.family_group || i.family_group === "all"
  );

  const color = day.city ? (CITY_COLORS[day.city] ?? DEFAULT_COLOR) : DEFAULT_COLOR;

  async function handleUpdateDay(formData: FormData) {
    await updateDay(day.id, formData);
    setEditing(false);
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-sm transition-shadow duration-200 ${
        isOpen ? "shadow-lg ring-2 ring-amber-300" : "hover:shadow-md"
      }`}
    >
      {/* ── Tile face (collapsed) ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left"
      >
        <div className="flex">
          {/* Left accent stripe with day number */}
          <div
            className={`${color.bg} flex flex-col items-center justify-center px-5 py-6 min-w-[88px] shrink-0`}
          >
            <span className={`text-xs font-semibold uppercase tracking-widest ${color.text} opacity-80`}>
              Day
            </span>
            <span className={`text-4xl font-black ${color.text} leading-none mt-1`}>
              {dayNumber}
            </span>
          </div>

          {/* Main tile body */}
          <div className="flex-1 bg-white px-5 py-4 flex flex-col justify-between min-h-[96px]">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {formatWeekday(day.trip_date)}
              </p>
              <p className="text-xl font-bold text-gray-900 leading-tight mt-0.5">
                {formatShortDate(day.trip_date)}
              </p>
              {day.city && (
                <span
                  className={`inline-block mt-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${color.bg} ${color.text}`}
                >
                  {day.city}
                </span>
              )}
            </div>

            {day.summary ? (
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{day.summary}</p>
            ) : (
              <p className="text-sm text-gray-300 italic mt-2">No summary yet</p>
            )}
          </div>

          {/* Chevron */}
          <div className="bg-white flex items-center pr-4">
            <svg
              className={`w-5 h-5 text-gray-300 transition-transform duration-200 ${
                isOpen ? "rotate-180 text-amber-400" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* ── Expanded content ── */}
      {isOpen && (
        <div className="bg-gray-50 border-t-2 border-amber-300">
          {/* Edit bar */}
          <div className="px-5 py-3 bg-white border-b border-gray-100 flex items-center gap-3">
            {editing ? (
              <form
                ref={formRef}
                action={handleUpdateDay}
                className="flex flex-col sm:flex-row gap-2 flex-1"
              >
                <input type="hidden" name="trip_date" value={day.trip_date} />
                <input
                  type="text"
                  name="label"
                  defaultValue={day.label ?? ""}
                  placeholder="Day label (optional)"
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-36"
                />
                <select
                  name="city"
                  defaultValue={day.city ?? ""}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">City…</option>
                  {LITHUANIAN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="text"
                  name="summary"
                  defaultValue={day.summary ?? ""}
                  placeholder="Day summary…"
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 flex-1 min-w-0"
                />
                <div className="flex gap-2 shrink-0">
                  <button type="submit" className="px-3 py-1 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-600">
                    Save
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="px-3 py-1 text-gray-500 rounded text-xs hover:bg-gray-100">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="text-sm text-gray-500 flex-1 min-w-0 truncate">
                  {day.summary ?? <span className="italic text-gray-300">No summary — add one here</span>}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                  className="text-xs text-gray-400 hover:text-amber-600 flex items-center gap-1 shrink-0 px-2 py-1 rounded hover:bg-amber-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit day
                </button>
              </>
            )}
          </div>

          <div className="p-5 space-y-5">
            {/* Map */}
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
                {sharedItems.length === 0 ? (
                  <p className="text-sm text-gray-400 italic mb-2">Nothing planned for the whole group yet</p>
                ) : (
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
                )}
                <AddItemForm dayId={day.id} familyGroup={null} label="shared activity" />
              </div>
            </div>

            {/* Family sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {FAMILIES.map((family) => {
                const familyItems = items.filter((i) => i.family_group === family.key);
                const hotel = hotelsForDay.find((h) => h.family_group === family.key) ?? null;
                return (
                  <FamilySection
                    key={family.key}
                    familyKey={family.key}
                    dayId={day.id}
                    dayDate={day.trip_date}
                    items={familyItems}
                    hotel={hotel}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
