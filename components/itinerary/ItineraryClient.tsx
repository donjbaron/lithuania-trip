"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  type ItineraryDay,
  type ItineraryItem,
  type Accommodation,
  type WishlistItem,
  type Restaurant,
  FAMILIES,
  LITHUANIAN_CITIES,
} from "@/lib/types";
import { updateDay } from "@/app/actions/itinerary";
import { moveActivitiesToDay, reorderActivities } from "@/app/actions/activities";
import { assignRestaurantToDay, unassignRestaurant, addAndAssignRestaurant } from "@/app/actions/restaurants";
import FamilySection from "./FamilySection";
import DayItemRow from "./DayItemRow";
import AddItemForm from "./AddItemForm";
import ActivityDetailModal from "./ActivityDetailModal";

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

interface PlaceResult {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  url: string;
  rating: number | null;
  priceLevel: number | null;
  cuisine: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadGoogleMapsWithPlaces(): Promise<void> {
  const w = window as any;
  if (w.google?.maps?.places) return Promise.resolve();
  if (w._gmapsLoading) return w._gmapsLoading;
  w._gmapsLoading = new Promise<void>((resolve) => {
    const existing = document.querySelector("script[src*='maps.googleapis.com']");
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return w._gmapsLoading;
}

interface Props {
  days: ItineraryDay[];
  items: ItineraryItem[];
  hotels: Accommodation[];
  activities: WishlistItem[];
  restaurants: Restaurant[];
}

type ItinerarySlot =
  | { type: "meal"; label: string; time: string; restaurant?: Restaurant }
  | { type: "activity"; activity: WishlistItem; time: string };

function geoDistance(a: WishlistItem, b: WishlistItem) {
  const dlat = (a.lat ?? 0) - (b.lat ?? 0);
  const dlng = (a.lng ?? 0) - (b.lng ?? 0);
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

// Split a nearest-neighbor-sorted list into two geographic clusters by
// finding the largest distance jump between consecutive items.
function clusterByGap(sorted: WishlistItem[]): [WishlistItem[], WishlistItem[]] {
  const n = sorted.length;
  if (n <= 1) return [sorted, []];

  let bestSplit = Math.ceil(n / 2);
  let bestGap = -Infinity;

  for (let i = 1; i < n; i++) {
    // Only consider gaps where both items have coordinates
    if (sorted[i - 1].lat != null && sorted[i].lat != null) {
      const gap = geoDistance(sorted[i - 1], sorted[i]);
      if (gap > bestGap) {
        bestGap = gap;
        bestSplit = i;
      }
    }
  }

  // Re-sort each cluster independently for optimal within-group ordering
  return [nearestNeighborSort(sorted.slice(0, bestSplit)), nearestNeighborSort(sorted.slice(bestSplit))];
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

const TOO_BUSY = 4;

function buildDayItinerary(
  activitiesForDay: WishlistItem[],
  isArrivalDay: boolean,
  date: string,
): {
  timed: { activity: WishlistItem; mins: number }[];
  slots: ItinerarySlot[];
  excess: WishlistItem[];
} {
  const fixed = activitiesForDay.filter((a) => a.time_slot);
  const flexible = activitiesForDay.filter((a) => !a.time_slot);
  const withCoords = flexible.filter((a) => a.lat != null && a.lng != null);
  const withoutCoords = flexible.filter((a) => a.lat == null || a.lng == null);
  const sortedFlexible = [...nearestNeighborSort(withCoords), ...withoutCoords];

  const timed: { activity: WishlistItem; mins: number }[] = [];
  fixed.forEach((a) => {
    const [h, m] = a.time_slot!.split(":").map(Number);
    timed.push({ activity: a, mins: h * 60 + m });
  });

  if (isArrivalDay) {
    const lastArrivalMins = fixed.length > 0
      ? Math.max(...fixed.map((a) => { const [h, m] = a.time_slot!.split(":").map(Number); return h * 60 + m; }))
      : 16 * 60;
    sortedFlexible.forEach((a, i) => timed.push({ activity: a, mins: lastArrivalMins + 90 + i * 75 }));
  } else {
    // Split into two geographic clusters: find the biggest distance gap
    // in the nearest-neighbor path and break there so nearby activities
    // stay in the same morning/afternoon block.
    const [morningGroup, afternoonGroup] = clusterByGap(sortedFlexible);
    morningGroup.forEach((a, i) => timed.push({ activity: a, mins: 10 * 60 + i * 90 }));
    afternoonGroup.forEach((a, i) => timed.push({ activity: a, mins: 14 * 60 + 30 + i * 90 }));
  }
  timed.sort((a, b) => a.mins - b.mins);

  const slots: ItinerarySlot[] = [];
  const sunsetTime = SUNSET[date] ?? null;
  if (!isArrivalDay) slots.push({ type: "meal", label: "Breakfast", time: "9:00 AM" });

  let lunchInserted = false, sunsetInserted = false;
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
  if (!isArrivalDay && !lunchInserted) slots.push({ type: "meal", label: "Lunch", time: "1:00 PM" });
  if (sunsetTime && !sunsetInserted) slots.push({ type: "meal", label: "Sunset", time: sunsetTime });

  const excess = sortedFlexible.length > TOO_BUSY ? sortedFlexible.slice(TOO_BUSY) : [];
  return { timed, slots, excess };
}

export default function ItineraryClient({ days, items, hotels, activities, restaurants }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<number>>(new Set());
  const [itinerarySuggested, setItinerarySuggested] = useState(false);
  const [itinerarySlots, setItinerarySlots] = useState<ItinerarySlot[]>([]);
  const [routeIds, setRouteIds] = useState<number[]>([]);
  const [busySuggestion, setBusySuggestion] = useState<{ excess: WishlistItem[]; nextDay: ItineraryDay | null } | null>(null);
  const [allBusyDays, setAllBusyDays] = useState<Record<string, { excess: WishlistItem[]; nextDay: ItineraryDay | null }>>({});
  const [restaurantSearching, setRestaurantSearching] = useState<"lunch" | "dinner" | null>(null);
  const [restaurantSuggestions, setRestaurantSuggestions] = useState<{ meal: "lunch" | "dinner"; results: PlaceResult[] } | null>(null);
  const [detailActivity, setDetailActivity] = useState<WishlistItem | null>(null);
  const [slotDragKey, setSlotDragKey] = useState<string | null>(null);
  const [slotInsertBefore, setSlotInsertBefore] = useState<string | "end" | null>(null);
  const [normalDragId, setNormalDragId] = useState<number | null>(null);
  const [normalInsertBefore, setNormalInsertBefore] = useState<number | "end" | null>(null);
  const [localActivityOrder, setLocalActivityOrder] = useState<number[] | null>(null);
  const [orderSaved, setOrderSaved] = useState(false);
  const [skippedActivityIds, setSkippedActivityIds] = useState<Set<number>>(new Set());
  const [travelLegs, setTravelLegs] = useState<Array<{ duration: string; mode: "walk" | "drive" } | null>>([]);
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([]);
  const autoSuggestRef = useRef(false);
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

  // Background: compute itinerary for all days to detect busy ones
  useEffect(() => {
    const busy: Record<string, { excess: WishlistItem[]; nextDay: ItineraryDay | null }> = {};
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const dayActs = activities.filter((a) => a.activity_date === day.trip_date);
      if (dayActs.length === 0) continue;
      const { excess } = buildDayItinerary(dayActs, day.trip_date === "2026-07-31", day.trip_date);
      if (excess.length > 0) {
        busy[day.trip_date] = { excess, nextDay: i < days.length - 1 ? days[i + 1] : null };
      }
    }
    setAllBusyDays(busy);
  }, [activities, days]);

  // Reset selection and scroll panel into view when switching days
  useEffect(() => {
    setSelectedActivityIds(new Set());
    setItinerarySuggested(false);
    setItinerarySlots([]);
    setRouteIds([]);
    setBusySuggestion(null);
    setLocalActivityOrder(null);
    setOrderSaved(false);
    setSkippedActivityIds(new Set());
    setRoutePoints([]);

    if (!selectedDate) return;

    if (autoSuggestRef.current) {
      autoSuggestRef.current = false;
      const dayActs = activities.filter((a) => a.activity_date === selectedDate);
      const isArrival = selectedDate === "2026-07-31";
      const { timed, slots, excess } = buildDayItinerary(dayActs, isArrival, selectedDate);
      const idx = days.findIndex((d) => d.trip_date === selectedDate);
      const nextDay = idx >= 0 && idx < days.length - 1 ? days[idx + 1] : null;
      setItinerarySlots(slots);
      setItinerarySuggested(true);
      if (excess.length > 0) setBusySuggestion({ excess, nextDay });
      // Store timed for Map button, but don't auto-map
      autoSuggestRef.current = false;
      void timed; // used below via itinerarySlots
    }

    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, [selectedDate]);

  async function suggestNearbyRestaurant(meal: "lunch" | "dinner", lat: number, lng: number) {
    setRestaurantSearching(meal);
    setRestaurantSuggestions(null);
    try {
      await loadGoogleMapsWithPlaces();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google;
      const service = new g.maps.places.PlacesService(document.createElement("div"));
      service.nearbySearch(
        { location: { lat, lng }, radius: 800, type: "restaurant" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (places: any[], status: string) => {
          if (status === g.maps.places.PlacesServiceStatus.OK && places?.length) {
            const FOOD_TYPES = new Set(["restaurant","food","meal_delivery","meal_takeaway","bakery","cafe","bar","night_club"]);
            const EXCLUDE_TYPES = new Set(["lodging","hotel","real_estate_agency","store","shopping_mall","gas_station","pharmacy","hospital","bank","church","museum","park","transit_station"]);
            const foodPlaces = (places as any[]).filter((p) => {
              const types: string[] = p.types ?? [];
              const hasFood = types.some((t) => FOOD_TYPES.has(t));
              const isExcluded = types.some((t) => EXCLUDE_TYPES.has(t));
              return hasFood && !isExcluded;
            });
            setRestaurantSuggestions({
              meal,
              results: foodPlaces.slice(0, 5).map((p: any) => {
                // Derive cuisine from place types, skipping generic tags
                const skipTypes = new Set(["restaurant","food","point_of_interest","establishment","bar","cafe"]);
                const cuisineType = (p.types as string[] ?? []).find((t) => !skipTypes.has(t));
                const cuisine = cuisineType
                  ? cuisineType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
                  : null;
                return {
                  name: p.name,
                  address: p.vicinity ?? p.formatted_address ?? "",
                  lat: p.geometry?.location?.lat() ?? null,
                  lng: p.geometry?.location?.lng() ?? null,
                  url: p.website ?? "",
                  rating: p.rating ?? null,
                  priceLevel: p.price_level ?? null,
                  cuisine,
                };
              }),
            });
          }
          setRestaurantSearching(null);
        }
      );
    } catch {
      setRestaurantSearching(null);
    }
  }

  function slotKey(s: ItinerarySlot) {
    return s.type === "activity" ? `a-${s.activity.id}` : `m-${s.label}`;
  }
  function isDraggableSlot(s: ItinerarySlot) {
    return s.type === "activity" || (s.type === "meal" && s.restaurant != null);
  }
  function slotsToStops(slots: ItinerarySlot[]) {
    return slots.flatMap(s => {
      if (s.type === "activity") return [{ lat: s.activity.lat, lng: s.activity.lng }];
      if (s.type === "meal" && s.restaurant) return [{ lat: s.restaurant.lat, lng: s.restaurant.lng }];
      return [];
    });
  }
  function applySlotDrop(dragKey: string, targetKey: string | "end") {
    const slots = itinerarySlots;
    const dragIdx = slots.findIndex(s => slotKey(s) === dragKey);
    if (dragIdx < 0) return;
    const next = [...slots];
    const [moved] = next.splice(dragIdx, 1);
    if (targetKey === "end") {
      next.push(moved);
    } else {
      const targetIdx = next.findIndex(s => slotKey(s) === targetKey);
      next.splice(targetIdx < 0 ? next.length : targetIdx, 0, moved);
    }
    setItinerarySlots(next);
    setSlotDragKey(null);
    setSlotInsertBefore(null);
    const actOrder = next.filter(s => s.type === "activity").map(s => (s as Extract<ItinerarySlot, {type:"activity"}>).activity.id);
    setRouteIds(actOrder);
    calcLegs(slotsToStops(next)).catch(() => {});
    const excessIds = activitiesForDay.filter(a => !actOrder.includes(a.id)).map(a => a.id);
    reorderActivities([...actOrder, ...excessIds]);
  }

  async function calcLegs(stops: { lat: number | null; lng: number | null }[]) {
    const empty = new Array(Math.max(0, stops.length - 1)).fill(null);
    if (stops.length < 2) { setTravelLegs(empty); return; }

    const validPairs = stops
      .slice(0, -1)
      .map((a, i) => ({ a, b: stops[i + 1], i }))
      .filter(p => p.a.lat != null && p.a.lng != null && p.b.lat != null && p.b.lng != null);

    const legs = [...empty];
    if (validPairs.length === 0) { setTravelLegs(legs); return; }

    try {
      await loadGoogleMapsWithPlaces();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google;
      await new Promise<void>((resolve) => {
        new g.maps.DistanceMatrixService().getDistanceMatrix(
          {
            origins: validPairs.map(p => ({ lat: p.a.lat!, lng: p.a.lng! })),
            destinations: validPairs.map(p => ({ lat: p.b.lat!, lng: p.b.lng! })),
            travelMode: g.maps.TravelMode.DRIVING,
            unitSystem: g.maps.UnitSystem.METRIC,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (res: any, status: string) => {
            if (status === "OK") {
              validPairs.forEach((pair, j) => {
                const el = res.rows[j]?.elements[j];
                if (el?.status === "OK") {
                  const dist: number = el.distance.value;
                  if (dist < 1600) {
                    const mins = Math.max(1, Math.round(dist / 80));
                    legs[pair.i] = { duration: `~${mins} min`, mode: "walk" };
                  } else {
                    legs[pair.i] = { duration: el.duration.text, mode: "drive" };
                  }
                }
              });
            }
            resolve();
          }
        );
      });
    } catch { /* ignore */ }

    setTravelLegs(legs);
  }

  function suggestItinerary() {
    if (itinerarySuggested) {
      setItinerarySuggested(false);
      setItinerarySlots([]);
      setRouteIds([]);
      setSelectedActivityIds(new Set());
      setBusySuggestion(null);
      setTravelLegs([]);
      return;
    }

    const isArrivalDay = selectedDay?.trip_date === "2026-07-31";
    const { timed, slots, excess } = buildDayItinerary(activitiesForDay.filter(a => !skippedActivityIds.has(a.id)), isArrivalDay, selectedDay?.trip_date ?? "");
    const idx = days.findIndex((d) => d.trip_date === selectedDay?.trip_date);
    const nextDay = idx >= 0 && idx < days.length - 1 ? days[idx + 1] : null;

    const date = selectedDay?.trip_date ?? "";
    const assignedLunch = restaurants.find(r => r.activity_date === date && r.meal_type === "lunch") ?? null;
    const assignedDinner = restaurants.find(r => r.activity_date === date && r.meal_type === "dinner") ?? null;
    const enrichedSlots: ItinerarySlot[] = slots.map(s => {
      if (s.type === "meal" && s.label === "Lunch" && assignedLunch) return { ...s, restaurant: assignedLunch };
      return s;
    });
    // Append dinner slot after last activity if assigned
    if (assignedDinner) {
      const lastActIdx = [...enrichedSlots].reverse().findIndex(s => s.type === "activity");
      if (lastActIdx >= 0) {
        const insertAt = enrichedSlots.length - lastActIdx;
        enrichedSlots.splice(insertAt, 0, { type: "meal", label: "Dinner", time: "7:30 PM", restaurant: assignedDinner });
      }
    }

    // Build combined stop list: activities + restaurants in slot order
    const stops = enrichedSlots.flatMap(s => {
      if (s.type === "activity") return [{ lat: s.activity.lat, lng: s.activity.lng }];
      if (s.type === "meal" && s.restaurant) return [{ lat: s.restaurant.lat, lng: s.restaurant.lng }];
      return [];
    });

    setBusySuggestion(excess.length > 0 ? { excess, nextDay } : null);
    setItinerarySlots(enrichedSlots);
    setRouteIds([]);
    setRoutePoints([]);
    setSelectedActivityIds(new Set());
    setItinerarySuggested(true);
    calcLegs(stops).catch(() => {});
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

  function openWithSuggestion(date: string) {
    if (selectedDate === date) {
      // Panel already open — apply suggestion directly without re-mounting
      const dayActs = activities.filter((a) => a.activity_date === date);
      const isArrival = date === "2026-07-31";
      const { timed, slots, excess } = buildDayItinerary(dayActs, isArrival, date);
      const idx = days.findIndex((d) => d.trip_date === date);
      const nextDay = idx >= 0 && idx < days.length - 1 ? days[idx + 1] : null;
      setItinerarySlots(slots);
      setRouteIds([]);
      setSelectedActivityIds(new Set());
      setItinerarySuggested(true);
      if (excess.length > 0) setBusySuggestion({ excess, nextDay });
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } else {
      autoSuggestRef.current = true;
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
              <div className={`${theme.bar} px-3 sm:px-5 py-2 sm:py-3 flex items-center justify-between`}>
                <span className="text-white text-xs sm:text-sm font-bold uppercase tracking-widest opacity-90">
                  Day {getDayNumber(day.trip_date)}
                </span>
                {dayItems.length > 0 && (
                  <span className="text-white text-xs opacity-70">
                    {dayItems.length}
                  </span>
                )}
              </div>

              {/* Tile body */}
              <div className="bg-white px-3 sm:px-5 py-3 sm:py-4 min-h-[120px] sm:min-h-[140px] flex flex-col gap-1">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{formatWeekday(day.trip_date)}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                  {formatDate(day.trip_date)}
                </p>
                {(() => {
                  const titles = dayActivities.map((a) => a.title);
                  const preview = titles.slice(0, 4).join(", ");
                  const overflow = titles.length > 4 ? ` +${titles.length - 4}` : "";
                  const desc = day.summary
                    ? titles.length > 0 ? `${day.summary} — ${preview}${overflow}` : day.summary
                    : preview + overflow;
                  return desc ? (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-3 leading-snug">{desc}</p>
                  ) : null;
                })()}
                {allBusyDays[day.trip_date] && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openWithSuggestion(day.trip_date); }}
                    className="mt-1 flex items-center gap-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2.5 py-1 hover:bg-yellow-100 transition-colors w-fit"
                  >
                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Busy day · see suggestion
                  </button>
                )}
                {dayActivities.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {dayActivities.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDetailActivity(a); }}
                          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-amber-700 w-full text-left"
                        >
                          {a.image_url
                            ? <img src={a.image_url} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                            : <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          }
                          <span className="truncate">{a.title}</span>
                        </button>
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
          <div className={`${selectedDay.city ? (CITY_THEME[selectedDay.city]?.bar ?? "bg-gray-400") : "bg-gray-400"} px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between`}>
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest opacity-80">
                Day {getDayNumber(selectedDay.trip_date)}
              </p>
              <h2 className="text-white text-xl sm:text-2xl font-bold leading-tight">{formatLongDate(selectedDay.trip_date)}</h2>
              {selectedDay.city && (
                <p className="text-white text-sm opacity-80 mt-0.5">{selectedDay.city}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-white opacity-70 hover:opacity-100 transition-opacity p-2 -mr-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Edit/summary bar */}
          <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
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
            <DayMapWrapper
              hotels={hotelsForDay}
              activities={mappedActivities}
              routeIds={routeIds}
              routePoints={routePoints.length > 0 ? routePoints : undefined}
              restaurantsForDay={selectedDay ? restaurants.filter(r => r.activity_date === selectedDay.trip_date && r.lat != null) : []}
            />

            {/* Activities from Activities tab */}
            {activitiesForDay.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-gray-800 text-sm mr-auto">Activities</h3>
                  {!itinerarySuggested && localActivityOrder && (
                    <button
                      onClick={async () => {
                        await reorderActivities(localActivityOrder);
                        setOrderSaved(true);
                        setTimeout(() => setOrderSaved(false), 2000);
                      }}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      {orderSaved ? "Saved ✓" : "Save order"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const exclude = (a: WishlistItem) =>
                        skippedActivityIds.has(a.id) ||
                        /\b(arriv|depart|flight|transfer|check.?in|check.?out|train|bus)\b/i.test(a.title);
                      let ids: number[];
                      let pts: { lat: number; lng: number }[] = [];
                      if (itinerarySuggested) {
                        ids = itinerarySlots
                          .filter((s) => s.type === "activity")
                          .map((s) => (s as Extract<typeof s, { type: "activity" }>).activity)
                          .filter((a) => !exclude(a))
                          .map((a) => a.id);
                        pts = itinerarySlots.flatMap((s) => {
                          if (s.type === "activity") {
                            const a = (s as Extract<typeof s, { type: "activity" }>).activity;
                            if (!exclude(a) && a.lat != null && a.lng != null) return [{ lat: a.lat, lng: a.lng }];
                          }
                          if (s.type === "meal") {
                            const r = (s as Extract<typeof s, { type: "meal" }>).restaurant;
                            if (r?.lat != null && r.lng != null) return [{ lat: r.lat, lng: r.lng }];
                          }
                          return [];
                        });
                      } else {
                        const ordered = localActivityOrder
                          ? localActivityOrder.map((id) => activitiesForDay.find((a) => a.id === id)!).filter(Boolean)
                          : activitiesForDay;
                        ids = ordered.filter((a) => !exclude(a)).map((a) => a.id);
                        pts = ids.map(id => activitiesForDay.find(a => a.id === id)!).filter(a => a?.lat != null).map(a => ({ lat: a.lat!, lng: a.lng! }));
                      }
                      setRouteIds(ids);
                      setRoutePoints(pts);
                      setSelectedActivityIds(new Set(ids));
                    }}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Visualize
                  </button>
                  <button
                    onClick={suggestItinerary}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                      itinerarySuggested
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : "bg-gray-800 text-white hover:bg-gray-900"
                    }`}
                  >
                    {itinerarySuggested ? "Clear" : "Suggest itinerary"}
                  </button>
                </div>

                {itinerarySuggested && busySuggestion && (
                  <div className="mx-4 mt-3 mb-1 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl space-y-2">
                    <p className="text-sm font-semibold text-yellow-800">
                      This day looks packed — consider spreading it out
                    </p>
                    <p className="text-xs text-yellow-700 leading-relaxed">
                      <span className="font-medium">{busySuggestion.excess.map((a) => a.title).join(", ")}</span>
                      {busySuggestion.nextDay
                        ? ` could move to ${formatLongDate(busySuggestion.nextDay.trip_date)}`
                        : " could move to another day"}.
                    </p>
                    {busySuggestion.nextDay && (
                      <button
                        onClick={async () => {
                          await moveActivitiesToDay(
                            busySuggestion!.excess.map((a) => a.id),
                            busySuggestion!.nextDay!.trip_date,
                          );
                          setBusySuggestion(null);
                          setItinerarySuggested(false);
                          setItinerarySlots([]);
                          setRouteIds([]);
                          setSelectedActivityIds(new Set());
                        }}
                        className="text-xs font-semibold px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Accept — move to {formatDate(busySuggestion.nextDay.trip_date)}
                      </button>
                    )}
                  </div>
                )}
                {itinerarySuggested ? (
                  /* ── Suggested itinerary view ── */
                  <div className="divide-y divide-gray-100">
                    {(() => {
                      let stopIdx = 0;
                      const dragHandle = (
                        <svg className="w-4 h-4 text-gray-300 shrink-0 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 6a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4zM8 14a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4zM8 22a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4z"/>
                        </svg>
                      );
                      function TravelLeg({ leg }: { leg: { duration: string; mode: "walk" | "drive" } }) {
                        return (
                          <div className="px-4 py-1 flex items-center gap-2 bg-white border-b border-gray-100">
                            <span className="w-16 shrink-0" />
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              {leg.mode === "walk"
                                ? <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M13.5 5.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z"/></svg>
                                : <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
                              }
                              <span>{leg.duration} {leg.mode}</span>
                            </div>
                          </div>
                        );
                      }
                      function dragProps(key: string) {
                        return {
                          draggable: true as const,
                          onDragStart(e: React.DragEvent) {
                            e.dataTransfer.setData("text/plain", key);
                            e.dataTransfer.effectAllowed = "move";
                            setTimeout(() => setSlotDragKey(key), 0);
                          },
                          onDragEnd() { setSlotDragKey(null); setSlotInsertBefore(null); },
                          onDragOver(e: React.DragEvent) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setSlotInsertBefore(e.clientY < rect.top + rect.height / 2 ? key : "end");
                          },
                          onDrop(e: React.DragEvent) {
                            e.preventDefault();
                            const dragKey = e.dataTransfer.getData("text/plain");
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const targetKey = e.clientY < rect.top + rect.height / 2 ? key : "end";
                            applySlotDrop(dragKey, targetKey);
                          },
                        };
                      }
                      return itinerarySlots.map((slot) => {
                        const key = slotKey(slot);
                        const draggable = isDraggableSlot(slot);
                        const isDragging = slotDragKey === key;
                        const showInsert = slotInsertBefore === key && slotDragKey !== key;

                        if (slot.type === "meal" && !slot.restaurant) {
                          const isSunset = slot.label === "Sunset";
                          return (
                            <div key={key} className={`px-4 py-2 flex items-center gap-3 ${isSunset ? "bg-orange-50" : "bg-gray-50"}`}>
                              <span className={`text-xs font-bold w-16 shrink-0 ${isSunset ? "text-orange-400" : "text-gray-400"}`}>{slot.time}</span>
                              <span className={`text-xs font-semibold uppercase tracking-wide ${isSunset ? "text-orange-500" : "text-gray-500"}`}>
                                {isSunset ? "Sunset" : slot.label}
                              </span>
                            </div>
                          );
                        }

                        const thisStop = stopIdx++;
                        const leg = thisStop > 0 ? (travelLegs[thisStop - 1] ?? null) : null;

                        if (slot.type === "meal" && slot.restaurant) {
                          const rest = slot.restaurant;
                          return (
                            <div key={key}>
                              {leg && <TravelLeg leg={leg} />}
                              {showInsert && <div className="h-0.5 bg-blue-500 mx-4" />}
                              <div
                                {...dragProps(key)}
                                className={`px-4 py-3 flex items-center gap-3 select-none cursor-grab active:cursor-grabbing transition-opacity bg-indigo-50/40 ${isDragging ? "opacity-40" : ""}`}
                              >
                                <span className="text-xs font-bold text-indigo-500 w-16 shrink-0 pointer-events-none">{slot.time}</span>
                                {dragHandle}
                                <span className="text-xs font-semibold uppercase tracking-wide text-indigo-400 shrink-0 pointer-events-none">{slot.label}</span>
                                {rest.image_url && <img src={rest.image_url} alt={rest.name} draggable={false} className="w-9 h-9 rounded-lg object-cover shrink-0 pointer-events-none" />}
                                <div className="min-w-0 flex-1 pointer-events-none">
                                  <p className="text-sm font-semibold text-gray-800 truncate">{rest.name}</p>
                                  {rest.cuisine && <p className="text-xs text-indigo-600">{rest.cuisine}</p>}
                                  {rest.address && <p className="text-xs text-gray-400 truncate">{rest.address}</p>}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // activity slot
                        const { activity, time } = slot as Extract<ItinerarySlot, { type: "activity" }>;
                        const interested = FAMILIES.filter((f) => activity[FAMILY_INTEREST[f.key]] as number);
                        const isSkipped = skippedActivityIds.has(activity.id);
                        return (
                          <div key={key}>
                            {leg && <TravelLeg leg={leg} />}
                            {showInsert && <div className="h-0.5 bg-blue-500 mx-4" />}
                            <div
                              {...(draggable ? dragProps(key) : {})}
                              className={`px-4 py-3 flex items-center gap-3 select-none cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? "opacity-40" : isSkipped ? "opacity-40 bg-gray-50" : "bg-amber-50/40"}`}
                            >
                              <span className="text-xs font-bold text-amber-600 w-16 shrink-0 pointer-events-none">{time}</span>
                              {dragHandle}
                              <button
                                draggable={false}
                                type="button"
                                title={isSkipped ? "Include" : "Skip"}
                                onClick={() => setSkippedActivityIds(prev => { const n = new Set(prev); isSkipped ? n.delete(activity.id) : n.add(activity.id); return n; })}
                                className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSkipped ? "border-gray-300 hover:border-gray-500" : "bg-amber-500 border-amber-500 hover:bg-amber-600"}`}
                              >
                                {!isSkipped && <svg className="w-3 h-3 text-white pointer-events-none" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 12 12"><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5"/></svg>}
                              </button>
                              <button draggable={false} type="button" onClick={() => setDetailActivity(activity)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                                {activity.image_url && (
                                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 pointer-events-none">
                                    <img src={activity.image_url} alt="" draggable={false} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0 pointer-events-none">
                                  <p className={`text-sm font-semibold hover:underline ${isSkipped ? "line-through text-gray-400" : "text-gray-800"}`}>{activity.title}</p>
                                  {activity.address && <p className="text-xs text-gray-400 truncate mt-0.5">{activity.address}</p>}
                                </div>
                              </button>
                              {interested.length > 0 && (
                                <div className="flex items-center gap-1 shrink-0 pointer-events-none">
                                  {interested.map((f) => (
                                    <div key={f.key} className="w-5 h-5 rounded-full overflow-hidden border border-white shadow-sm">
                                      <img src={`/families/${f.key}.png`} alt={f.label} draggable={false} className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                    {slotInsertBefore === "end" && slotDragKey !== null && <div className="h-0.5 bg-blue-500 mx-4" />}
                  </div>
                ) : (
                  /* ── Normal activity list (draggable) ── */
                  <div className="divide-y divide-gray-100">
                    {(localActivityOrder
                      ? localActivityOrder.map((id) => activitiesForDay.find((a) => a.id === id)!).filter(Boolean)
                      : activitiesForDay
                    ).map((a) => {
                      const isPinned = selectedActivityIds.has(a.id);
                      const isSkipped = skippedActivityIds.has(a.id);
                      const interested = FAMILIES.filter((f) => a[FAMILY_INTEREST[f.key]] as number);
                      const isDragging = normalDragId === a.id;
                      const showInsert = normalInsertBefore === a.id && normalDragId !== a.id;
                      return (
                        <div key={a.id}>
                          {showInsert && <div className="h-0.5 bg-blue-500 mx-4" />}
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", String(a.id));
                              e.dataTransfer.effectAllowed = "move";
                              setTimeout(() => setNormalDragId(a.id), 0);
                            }}
                            onDragEnd={() => { setNormalDragId(null); setNormalInsertBefore(null); }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setNormalInsertBefore(e.clientY < rect.top + rect.height / 2 ? a.id : "end");
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const draggedId = Number(e.dataTransfer.getData("text/plain"));
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const before = e.clientY < rect.top + rect.height / 2 ? a.id : null;
                              const current = localActivityOrder ?? activitiesForDay.map((x) => x.id);
                              const filtered = current.filter((id) => id !== draggedId);
                              const targetIdx = before != null ? filtered.indexOf(before) : filtered.length;
                              const newIds = [...filtered.slice(0, targetIdx), draggedId, ...filtered.slice(targetIdx)];
                              setLocalActivityOrder(newIds);
                              setOrderSaved(false);
                              setNormalDragId(null);
                              setNormalInsertBefore(null);
                            }}
                            className={`px-4 py-3 flex items-center gap-3 select-none cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? "opacity-40" : isSkipped ? "opacity-40 bg-gray-50" : isPinned ? "bg-amber-50" : "hover:bg-gray-50"}`}
                          >
                            <svg className="w-4 h-4 text-gray-300 shrink-0 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 6a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4zM8 14a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4zM8 22a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4z"/>
                            </svg>
                            {/* Skip checkbox */}
                            <button
                              draggable={false}
                              type="button"
                              title={isSkipped ? "Include" : "Skip"}
                              onClick={() => setSkippedActivityIds(prev => { const n = new Set(prev); isSkipped ? n.delete(a.id) : n.add(a.id); return n; })}
                              className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSkipped ? "border-gray-300 hover:border-gray-500" : "bg-amber-500 border-amber-500 hover:bg-amber-600"}`}
                            >
                              {!isSkipped && <svg className="w-3 h-3 text-white pointer-events-none" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 12 12"><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5"/></svg>}
                            </button>
                            <button
                              draggable={false}
                              type="button"
                              onClick={() => setDetailActivity(a)}
                              className="flex items-center gap-3 flex-1 min-w-0 text-left"
                            >
                              {a.image_url && (
                                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 pointer-events-none">
                                  <img src={a.image_url} alt="" draggable={false} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0 pointer-events-none">
                                <p className={`text-sm font-semibold hover:underline ${isSkipped ? "line-through text-gray-400" : isPinned ? "text-amber-900" : "text-gray-800"}`}>{a.title}</p>
                                {a.address && <p className="text-xs text-gray-400 truncate mt-0.5">{a.address}</p>}
                              </div>
                            </button>
                            {interested.length > 0 && (
                              <div className="flex items-center gap-1 shrink-0 pointer-events-none">
                                {interested.map((f) => (
                                  <div key={f.key} className="w-5 h-5 rounded-full overflow-hidden border border-white shadow-sm">
                                    <img src={`/families/${f.key}.png`} alt={f.label} draggable={false} className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {normalInsertBefore === "end" && normalDragId !== null && <div className="h-0.5 bg-blue-500 mx-4" />}
                  </div>
                )}
              </div>
            )}

            {/* Restaurant recommendations */}
            {selectedDay && (() => {
              const city = selectedDay.city ?? null;
              const date = selectedDay.trip_date;
              const mapsQuery = encodeURIComponent(`restaurants in ${city ?? "Lithuania"}`);
              const yelpQuery = encodeURIComponent(`restaurants ${city ?? "Lithuania"}`);

              // Candidates: restaurants matching this city or already assigned to this date
              const candidates = restaurants.filter(
                (r) => (city && r.city === city) || r.activity_date === date || !r.activity_date
              );

              const assignedLunch = restaurants.find((r) => r.activity_date === date && r.meal_type === "lunch") ?? null;
              const assignedDinner = restaurants.find((r) => r.activity_date === date && r.meal_type === "dinner") ?? null;

              // Options for each picker — exclude the other meal's pick
              const lunchOptions = candidates.filter((r) => r.id !== assignedDinner?.id);
              const dinnerOptions = candidates.filter((r) => r.id !== assignedLunch?.id);

              // Find the last activity with coordinates before a given meal slot
              function getRefLocation(meal: "lunch" | "dinner"): { lat: number; lng: number } | null {
                const mealLabel = meal === "lunch" ? "Lunch" : "Dinner";
                const mealIdx = itinerarySlots.findIndex(
                  (s) => s.type === "meal" && s.label === mealLabel
                );
                const searchUntil = mealIdx >= 0 ? mealIdx : itinerarySlots.length;
                for (let i = searchUntil - 1; i >= 0; i--) {
                  const s = itinerarySlots[i];
                  if (s.type === "activity" && s.activity.lat && s.activity.lng)
                    return { lat: s.activity.lat, lng: s.activity.lng };
                }
                // Fallback: any activity on this day with coords
                for (const a of activitiesForDay) {
                  if (a.lat && a.lng) return { lat: a.lat, lng: a.lng };
                }
                return null;
              }

              function RestaurantCard({ r }: { r: Restaurant }) {
                return (
                  <div className="flex items-start gap-3">
                    {r.image_url && (
                      <img src={r.image_url} alt={r.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{r.name}</p>
                      {r.cuisine && <p className="text-xs text-indigo-600 font-medium mt-0.5">{r.cuisine}</p>}
                      {r.address && <p className="text-xs text-gray-400 mt-0.5">{r.address}</p>}
                      {r.notes && <p className="text-xs text-gray-500 italic mt-0.5">{r.notes}</p>}
                      <div className="flex gap-3 mt-1">
                        {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:underline">More info →</a>}
                        {r.lat && r.lng && <a href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">Map →</a>}
                      </div>
                    </div>
                    <button onClick={() => unassignRestaurant(r.id)}
                      className="shrink-0 p-1 text-gray-300 hover:text-red-400 transition-colors" title="Remove">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              }

              function MealSlot({ meal, label, assigned, options }: {
                meal: "lunch" | "dinner";
                label: string;
                assigned: Restaurant | null;
                options: Restaurant[];
              }) {
                const refLoc = getRefLocation(meal);
                const isSearchingThis = restaurantSearching === meal;
                const thisSuggestions = restaurantSuggestions?.meal === meal ? restaurantSuggestions.results : [];

                return (
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        {meal === "lunch" ? "☀️" : "🌙"} {label}
                      </span>
                      {!assigned && options.length > 0 && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) assignRestaurantToDay(Number(e.target.value), date, meal);
                            e.target.value = "";
                          }}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          <option value="">Choose restaurant…</option>
                          {options.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      )}
                      {!assigned && refLoc && (
                        <button
                          type="button"
                          onClick={() => suggestNearbyRestaurant(meal, refLoc.lat, refLoc.lng)}
                          disabled={isSearchingThis}
                          className="ml-auto flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors font-medium"
                        >
                          {isSearchingThis
                            ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                            : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                          }
                          Suggest nearby
                        </button>
                      )}
                    </div>

                    {/* Nearby suggestions */}
                    {thisSuggestions.length > 0 && (
                      <div className="border border-indigo-100 rounded-xl overflow-hidden divide-y divide-gray-100 bg-white">
                        <p className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50">
                          Nearby restaurants — click to add &amp; assign
                        </p>
                        {thisSuggestions.map((p, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              addAndAssignRestaurant(p.name, p.address || null, p.lat, p.lng, p.url || null, city, p.cuisine, date, meal);
                              setRestaurantSuggestions(null);
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-800">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {p.rating != null && (
                                <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5">
                                  <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                  {p.rating.toFixed(1)}
                                </span>
                              )}
                              {p.priceLevel != null && (
                                <span className="text-xs text-green-700 font-medium">
                                  {"$".repeat(p.priceLevel + 1)}
                                </span>
                              )}
                              {p.cuisine && (
                                <span className="text-xs text-gray-400">{p.cuisine}</span>
                              )}
                              {p.address && (
                                <span className="text-xs text-gray-400 truncate">{p.address}</span>
                              )}
                            </div>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setRestaurantSuggestions(null)}
                          className="w-full text-center px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {assigned
                      ? <RestaurantCard r={assigned} />
                      : <p className="text-xs text-gray-400 italic">None assigned</p>
                    }
                  </div>
                );
              }

              return (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 text-sm">Restaurants</h3>
                    <div className="flex gap-3">
                      <a href={`https://www.google.com/maps/search/${mapsQuery}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-gray-600">Google Maps</a>
                      <a href={`https://www.yelp.com/search?find_desc=restaurants&find_loc=${yelpQuery}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-gray-600">Yelp</a>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    <MealSlot meal="lunch" label="Lunch" assigned={assignedLunch} options={lunchOptions} />
                    <MealSlot meal="dinner" label="Dinner" assigned={assignedDinner} options={dinnerOptions} />
                  </div>
                </div>
              );
            })()}

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

      {/* Activity detail modal */}
      {detailActivity && (
        <ActivityDetailModal
          activity={detailActivity}
          onClose={() => setDetailActivity(null)}
        />
      )}
    </div>
  );
}
