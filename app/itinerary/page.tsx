export const dynamic = "force-dynamic";

import { dbAll } from "@/lib/db";
import { type ItineraryDay, type ItineraryItem, type Accommodation, type WishlistItem, type Restaurant } from "@/lib/types";
import ItineraryClient from "@/components/itinerary/ItineraryClient";

export default async function ItineraryPage() {
  const [days, items, hotels, activities, restaurants] = await Promise.all([
    dbAll<ItineraryDay>("SELECT * FROM itinerary_days ORDER BY trip_date ASC"),
    dbAll<ItineraryItem>("SELECT * FROM itinerary_items ORDER BY sort_order ASC"),
    dbAll<Accommodation>("SELECT * FROM accommodations ORDER BY check_in ASC"),
    dbAll<WishlistItem>("SELECT * FROM wishlist_items WHERE activity_date IS NOT NULL ORDER BY activity_date ASC, title ASC"),
    dbAll<Restaurant>("SELECT * FROM restaurants ORDER BY city ASC, meal_type ASC, name ASC"),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Itinerary</h2>
        <span className="text-sm text-gray-400">Jul 31 – Aug 6, 2026</span>
      </div>
      <ItineraryClient days={days} items={items} hotels={hotels} activities={activities} restaurants={restaurants} />
    </div>
  );
}
