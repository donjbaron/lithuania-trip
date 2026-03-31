import Image from "next/image";
import { FAMILIES, type Accommodation } from "@/lib/types";

const TRIP_DATES = [
  "2025-07-31",
  "2025-08-01",
  "2025-08-02",
  "2025-08-03",
  "2025-08-04",
  "2025-08-05",
  "2025-08-06",
];

const CITY_OVERLAY: Record<string, string> = {
  Vilnius:  "from-amber-900/80 to-amber-700/60",
  Kaunas:   "from-blue-900/80 to-blue-700/60",
  Palanga:  "from-cyan-900/80 to-cyan-700/60",
  Trakai:   "from-green-900/80 to-green-700/60",
  Klaipeda: "from-purple-900/80 to-purple-700/60",
  Siauliai: "from-orange-900/80 to-orange-700/60",
  Other:    "from-gray-900/80 to-gray-700/60",
};

const CITY_SOLID: Record<string, string> = {
  Vilnius:  "bg-amber-500",
  Kaunas:   "bg-blue-500",
  Palanga:  "bg-cyan-500",
  Trakai:   "bg-green-600",
  Klaipeda: "bg-purple-500",
  Siauliai: "bg-orange-500",
  Other:    "bg-gray-400",
};

function formatColHeader(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const isLast = dateStr === TRIP_DATES[TRIP_DATES.length - 1];
  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(dt),
    date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(dt),
    isLast,
  };
}

function hotelOn(hotels: Accommodation[], familyKey: string, date: string): Accommodation | null {
  return hotels.find(
    (h) => h.family_group === familyKey && h.check_in <= date && h.check_out > date
  ) ?? null;
}

function buildSpans(hotels: Accommodation[], familyKey: string) {
  const spans: { hotel: Accommodation; startIdx: number; length: number }[] = [];
  let i = 0;
  while (i < TRIP_DATES.length) {
    const hotel = hotelOn(hotels, familyKey, TRIP_DATES[i]);
    if (!hotel) { i++; continue; }
    let len = 1;
    while (
      i + len < TRIP_DATES.length &&
      hotelOn(hotels, familyKey, TRIP_DATES[i + len])?.id === hotel.id
    ) { len++; }
    spans.push({ hotel, startIdx: i, length: len });
    i += len;
  }
  return spans;
}

function mapsUrl(hotel: Accommodation) {
  const q = encodeURIComponent(`${hotel.name} ${hotel.city} Lithuania`);
  return `https://www.google.com/maps/search/?q=${q}`;
}

interface Props {
  hotels: Accommodation[];
  photoUrls: Record<string, string>;
}

export default function HotelCalendar({ hotels, photoUrls }: Props) {
  const numCols = TRIP_DATES.length;
  const ROW_H = 110;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Column headers */}
      <div
        className="grid border-b border-gray-200"
        style={{ gridTemplateColumns: `180px repeat(${numCols}, 1fr)` }}
      >
        <div className="bg-gray-50" />
        {TRIP_DATES.map((d) => {
          const { weekday, date, isLast } = formatColHeader(d);
          return (
            <div
              key={d}
              className={`px-2 py-3 text-center bg-gray-50 border-l border-gray-200 ${isLast ? "opacity-40" : ""}`}
            >
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{weekday}</p>
              <p className="text-sm font-bold text-gray-700 mt-0.5">{date}</p>
              {isLast && <p className="text-[10px] text-gray-400 mt-0.5">checkout</p>}
            </div>
          );
        })}
      </div>

      {/* Family rows */}
      {FAMILIES.map((family, fi) => {
        const spans = buildSpans(hotels, family.key);

        return (
          <div
            key={family.key}
            className={`grid ${fi < FAMILIES.length - 1 ? "border-b border-gray-200" : ""}`}
            style={{ gridTemplateColumns: `180px repeat(${numCols}, 1fr)`, minHeight: ROW_H }}
          >
            {/* Family label */}
            <div className="px-4 py-4 flex items-center gap-3 border-r border-gray-100 bg-gray-50/50">
              <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border-2 border-gray-200 shadow-sm">
                <Image
                  src={`/families/${family.key}.png`}
                  unoptimized
                  alt={family.label}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{family.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{family.members.replace(/·/g, "\n")}</p>
              </div>
            </div>

            {/* Date columns + hotel blocks */}
            <div
              className="relative"
              style={{
                gridColumn: `2 / span ${numCols}`,
                display: "grid",
                gridTemplateColumns: `repeat(${numCols}, 1fr)`,
              }}
            >
              {/* Grid lines */}
              {TRIP_DATES.map((d) => (
                <div key={d} className="border-l border-gray-100 h-full" />
              ))}

              {/* Hotel blocks */}
              <div className="absolute inset-0 p-2">
                <div className="relative w-full h-full">
                  {spans.map(({ hotel, startIdx, length }) => {
                    const photoUrl = photoUrls[`${hotel.name}|${hotel.city}`];
                    const overlay = CITY_OVERLAY[hotel.city] ?? CITY_OVERLAY.Other;
                    const solid = CITY_SOLID[hotel.city] ?? CITY_SOLID.Other;

                    return (
                      <a
                        key={hotel.id}
                        href={mapsUrl(hotel)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-y-0 rounded-xl overflow-hidden shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-150 group"
                        style={{
                          left: `calc(${(startIdx / numCols) * 100}% + 4px)`,
                          width: `calc(${(length / numCols) * 100}% - 8px)`,
                        }}
                        title={`${hotel.name} · Open in Google Maps`}
                      >
                        {/* Photo background */}
                        {photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoUrl}
                            alt={hotel.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`absolute inset-0 ${solid}`} />
                        )}

                        {/* Gradient overlay for text legibility */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${overlay}`} />

                        {/* Text + icon */}
                        <div className="relative h-full flex flex-col justify-center px-4">
                          <p className="text-sm font-bold text-white truncate leading-tight drop-shadow">
                            {hotel.name}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <p className="text-xs text-white/80 truncate">{hotel.city}</p>
                            <svg
                              className="w-3 h-3 text-white/60 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
