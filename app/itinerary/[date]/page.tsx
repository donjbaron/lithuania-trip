export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { dbGet, dbAll } from "@/lib/db";
import {
  type ItineraryDay,
  type ItineraryItem,
  type Accommodation,
  FAMILIES,
} from "@/lib/types";
import FamilySection from "@/components/itinerary/FamilySection";
import DayItemRow from "@/components/itinerary/DayItemRow";
import AddItemForm from "@/components/itinerary/AddItemForm";
import DayMapWrapper from "@/components/map/DayMapWrapper";

function formatDayHeader(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function getDayNumber(dateStr: string) {
  const start = new Date(2026, 6, 31); // Jul 31
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Math.round((date.getTime() - start.getTime()) / 86400000) + 1;
}

function getAdjacentDates(currentDate: string): {
  prev: string | null;
  next: string | null;
} {
  const tripDates = [
    "2026-07-31",
    "2026-08-01",
    "2026-08-02",
    "2026-08-03",
    "2026-08-04",
    "2026-08-05",
    "2026-08-06",
  ];
  const idx = tripDates.indexOf(currentDate);
  return {
    prev: idx > 0 ? tripDates[idx - 1] : null,
    next: idx < tripDates.length - 1 ? tripDates[idx + 1] : null,
  };
}

function getHotelForFamilyOnDate(
  hotels: Accommodation[],
  familyGroup: string,
  date: string
): Accommodation | null {
  return (
    hotels.find(
      (h) =>
        h.family_group === familyGroup &&
        h.check_in <= date &&
        h.check_out > date
    ) ?? null
  );
}

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  const day = await dbGet<ItineraryDay>(
    "SELECT * FROM itinerary_days WHERE trip_date = ?",
    [date]
  );
  if (!day) notFound();

  const [allItems, hotels] = await Promise.all([
    dbAll<ItineraryItem>("SELECT * FROM itinerary_items WHERE day_id = ? ORDER BY sort_order ASC", [day.id]),
    dbAll<Accommodation>("SELECT * FROM accommodations WHERE check_in <= ? AND check_out > ? ORDER BY check_in ASC", [date, date]),
  ]);

  const sharedItems = allItems.filter(
    (i) => !i.family_group || i.family_group === "all"
  );
  const { prev, next } = getAdjacentDates(date);
  const dayNum = getDayNumber(date);

  return (
    <div className="space-y-6">
      {/* Day header */}
      <div className="flex items-center gap-3">
        <Link
          href="/itinerary"
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Back to itinerary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">
              Day {dayNum}
            </span>
            {day.label && (
              <span className="text-sm text-gray-500">— {day.label}</span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {formatDayHeader(date)}
          </h2>
        </div>
        <div className="flex gap-1">
          {prev && (
            <Link
              href={`/itinerary/${prev}`}
              className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </Link>
          )}
          {next && (
            <Link
              href={`/itinerary/${next}`}
              className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
            >
              Next
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {/* Map */}
      <DayMapWrapper hotels={hotels} />

      {/* Shared activities */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
          <h3 className="font-semibold text-gray-800">For Everyone</h3>
          <p className="text-xs text-gray-500 mt-0.5">Shared activities &amp; group plans</p>
        </div>
        <div className="px-4 py-3">
          {sharedItems.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Nothing planned for everyone yet</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {sharedItems
                .sort((a, b) => {
                  if (a.time_slot && b.time_slot)
                    return a.time_slot.localeCompare(b.time_slot);
                  if (a.time_slot) return -1;
                  if (b.time_slot) return 1;
                  return a.sort_order - b.sort_order;
                })
                .map((item) => (
                  <DayItemRow key={item.id} item={item} />
                ))}
            </div>
          )}
          <AddItemForm dayId={day.id} familyGroup={null} label="shared activity" />
        </div>
      </div>

      {/* Family sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {FAMILIES.map((family) => {
          const familyItems = allItems.filter(
            (i) => i.family_group === family.key
          );
          const hotel = getHotelForFamilyOnDate(hotels, family.key, date);
          return (
            <FamilySection
              key={family.key}
              familyKey={family.key}
              dayId={day.id}
              dayDate={date}
              items={familyItems}
              hotel={hotel}
            />
          );
        })}
      </div>
    </div>
  );
}
