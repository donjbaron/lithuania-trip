export type FamilyGroup = "family1" | "family2" | "family3" | "all";

export interface ItineraryDay {
  id: number;
  trip_date: string;
  label: string | null;
  city: string | null;
  summary: string | null;
  breakfast_time: string | null;
  sort_order: number;
  created_at: string;
}

export interface ItineraryItem {
  id: number;
  day_id: number;
  time_slot: string | null;
  title: string;
  notes: string | null;
  added_by: string | null;
  family_group: FamilyGroup | null;
  sort_order: number;
  created_at: string;
}

export interface DayWithItems extends ItineraryDay {
  items: ItineraryItem[];
}

export interface Accommodation {
  id: number;
  city: string;
  name: string;
  check_in: string;
  check_out: string;
  address: string | null;
  booking_ref: string | null;
  booking_url: string | null;
  notes: string | null;
  added_by: string | null;
  family_group: FamilyGroup | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface WishlistItem {
  id: number;
  title: string;
  category: "sight" | "food" | "activity" | "other";
  city: string | null;
  location: string | null;
  description: string | null;
  url: string | null;
  activity_date: string | null;
  time_slot: string | null;
  interested_family1: number;
  interested_family2: number;
  interested_family3: number;
  image_url: string | null;
  wiki_url: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  is_done: number;
  duration_mins: number;
  added_by: string | null;
  created_at: string;
}

export interface Restaurant {
  id: number;
  name: string;
  city: string | null;
  meal_type: "breakfast" | "lunch" | "dinner" | null;
  activity_date: string | null;
  url: string | null;
  address: string | null;
  cuisine: string | null;
  notes: string | null;
  image_url: string | null;
  interested_family1: number;
  interested_family2: number;
  interested_family3: number;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export const FAMILY_MEMBERS = [
  "Don",
  "Tova",
  "Jake",
  "Tali",
  "Misha",
  "Sophie",
  "Judy",
  "Paul",
  "Raquel",
];

export const FAMILIES = [
  {
    key: "family1" as FamilyGroup,
    label: "Don's Family",
    members: "Don · Tova · Jake · Tali",
    color: "amber",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-300",
    headerClass: "bg-amber-500",
    badgeClass: "bg-amber-100 text-amber-700",
  },
  {
    key: "family2" as FamilyGroup,
    label: "Grandparents",
    members: "Misha · Sophie",
    color: "blue",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-300",
    headerClass: "bg-blue-500",
    badgeClass: "bg-blue-100 text-blue-700",
  },
  {
    key: "family3" as FamilyGroup,
    label: "Judy's Family",
    members: "Judy · Paul · Raquel",
    color: "green",
    bgClass: "bg-green-50",
    borderClass: "border-green-300",
    headerClass: "bg-green-600",
    badgeClass: "bg-green-100 text-green-700",
  },
] as const;

export const LITHUANIAN_CITIES = [
  "Vilnius",
  "Kaunas",
  "Trakai",
  "Klaipeda",
  "Siauliai",
  "Palanga",
  "Other",
];

export const CITY_COORDS: Record<string, [number, number]> = {
  Vilnius: [54.6872, 25.2797],
  Kaunas: [54.8985, 23.9036],
  Trakai: [54.6379, 24.934],
  Klaipeda: [55.7033, 21.1443],
  Siauliai: [55.9349, 23.3137],
  Palanga: [55.9209, 21.0688],
};
