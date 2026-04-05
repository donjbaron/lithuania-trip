"use client";

import dynamic from "next/dynamic";
import type { Accommodation, WishlistItem, Restaurant } from "@/lib/types";

const GoogleDayMap = dynamic(() => import("./GoogleDayMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] bg-gray-100 rounded-xl flex items-center justify-center text-sm text-gray-400">
      Loading map…
    </div>
  ),
});

export default function DayMapWrapper({
  hotels,
  activities,
  routeIds,
  routePoints,
  restaurantsForDay,
}: {
  hotels: Accommodation[];
  activities: WishlistItem[];
  routeIds?: number[];
  routePoints?: { lat: number; lng: number }[];
  restaurantsForDay?: Restaurant[];
}) {
  return (
    <GoogleDayMap
      hotels={hotels}
      activities={activities}
      routeIds={routeIds ?? []}
      routePoints={routePoints}
      restaurantsForDay={restaurantsForDay ?? []}
    />
  );
}
