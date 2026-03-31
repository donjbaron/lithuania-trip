import { FAMILIES, type Accommodation } from "@/lib/types";

const CITY_COLORS: Record<string, string> = {
  Vilnius: "border-amber-500",
  Kaunas: "border-blue-500",
  Trakai: "border-green-500",
  Klaipeda: "border-purple-500",
  Siauliai: "border-orange-500",
  Palanga: "border-cyan-500",
  Other: "border-gray-400",
};

function formatDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(y, m - 1, day)
  );
}

function nightsBetween(checkIn: string, checkOut: string) {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  );
}

export default function HotelCard({ hotel }: { hotel: Accommodation }) {
  const borderColor = CITY_COLORS[hotel.city] ?? "border-gray-400";
  const nights = nightsBetween(hotel.check_in, hotel.check_out);
  const family = FAMILIES.find((f) => f.key === hotel.family_group);

  return (
    <div className={`bg-white rounded-lg border-l-4 ${borderColor} border border-gray-200 shadow-sm p-4`}>
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold text-gray-800">{hotel.name}</h3>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{hotel.city}</span>
        {family && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${family.badgeClass}`}>
            {family.label}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 mt-1">
        {formatDate(hotel.check_in)} → {formatDate(hotel.check_out)}
        <span className="text-gray-400 ml-2">({nights} night{nights !== 1 ? "s" : ""})</span>
      </p>
      {hotel.address && <p className="text-xs text-gray-500 mt-1">{hotel.address}</p>}
    </div>
  );
}
