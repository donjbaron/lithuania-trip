export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { type ItineraryDay, type ItineraryItem, type Accommodation, type WishlistItem } from "@/lib/types";
import ItineraryClient from "@/components/itinerary/ItineraryClient";

export default function ItineraryPage() {
  const db = getDb();

  const days = db
    .prepare("SELECT * FROM itinerary_days ORDER BY trip_date ASC")
    .all() as ItineraryDay[];

  const items = db
    .prepare("SELECT * FROM itinerary_items ORDER BY sort_order ASC")
    .all() as ItineraryItem[];

  const hotels = db
    .prepare("SELECT * FROM accommodations ORDER BY check_in ASC")
    .all() as Accommodation[];

  const activities = db
    .prepare("SELECT * FROM wishlist_items WHERE activity_date IS NOT NULL ORDER BY activity_date ASC, title ASC")
    .all() as WishlistItem[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Itinerary</h2>
        <span className="text-sm text-gray-400">Jul 31 – Aug 6, 2026</span>
      </div>

      <ItineraryClient
        days={days}
        items={items}
        hotels={hotels}
        activities={activities}
      />

    </div>
  );
}
