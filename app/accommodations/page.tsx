export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { type Accommodation } from "@/lib/types";
import HotelCalendar from "@/components/accommodations/HotelCalendar";

function getAccommodations(): Accommodation[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM accommodations ORDER BY check_in ASC")
    .all() as Accommodation[];
}

// Photos sourced directly from each hotel's official website
const HOTEL_PHOTOS: Record<string, string> = {
  "Congress|Vilnius":
    "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/19/8d/14/3b/street-view.jpg?w=1200&h=1200&s=1",
  "Neringa|Vilnius":
    "https://neringavilnius.com/wp-content/uploads/2024/08/Neringa-%C2%A9Norbert-Tukaj-2855-scaled.jpg",
  "Best Western Saltakos|Kaunas":
    "https://www.santakahotel.eu/skins/bwk/images/hero.jpg",
  "Kaunas Hotel|Kaunas":
    "https://www.kaunashotelsweb.com/data/Photos/700x500w/17097/1709712/1709712039.JPEG",
  "Mana Suites and Sea|Palanga":
    "https://www.manahotels.lt/storage/app/media/images_Palanga/img_home_head%402x.jpg",
};

export default function AccommodationsPage() {
  const hotels = getAccommodations();
  const photoUrls = HOTEL_PHOTOS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Hotels & Accommodations</h2>
        <span className="text-sm text-gray-400">Jul 31 – Aug 6, 2025</span>
      </div>
      <HotelCalendar hotels={hotels} photoUrls={photoUrls} />
    </div>
  );
}
