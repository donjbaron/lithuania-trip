"use client";

import { FAMILIES } from "@/lib/types";
import type { Accommodation } from "@/lib/types";

interface Props {
  hotels: Accommodation[];
}

function embedUrl(hotel: Accommodation): string {
  if (hotel.lat != null && hotel.lng != null) {
    return `https://maps.google.com/maps?q=${hotel.lat},${hotel.lng}&z=15&output=embed`;
  }
  const q = encodeURIComponent(`${hotel.name} ${hotel.city} Lithuania`);
  return `https://maps.google.com/maps?q=${q}&output=embed`;
}

export default function DayGoogleMap({ hotels }: Props) {
  const hotelsWithInfo = hotels.filter((h) => h.name);

  if (hotelsWithInfo.length === 0) {
    return (
      <div className="h-48 bg-gray-100 rounded-xl flex items-center justify-center text-sm text-gray-400">
        Add hotels to see them on the map
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {hotelsWithInfo.length === 1 ? (
        <div>
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            {(() => {
              const family = FAMILIES.find((f) => f.key === hotelsWithInfo[0].family_group);
              return (
                <>
                  <span className="text-xs font-medium text-gray-500">{family?.label ?? "Hotel"}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-600 font-medium">{hotelsWithInfo[0].name}</span>
                </>
              );
            })()}
          </div>
          <iframe
            src={embedUrl(hotelsWithInfo[0])}
            className="w-full"
            style={{ height: 280, border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={hotelsWithInfo[0].name}
          />
        </div>
      ) : (
        <div>
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Where we&apos;re staying</span>
          </div>
          <div className={`grid gap-0 divide-x divide-gray-200`} style={{ gridTemplateColumns: `repeat(${hotelsWithInfo.length}, 1fr)` }}>
            {hotelsWithInfo.map((hotel) => {
              const family = FAMILIES.find((f) => f.key === hotel.family_group);
              return (
                <div key={hotel.id} className="flex flex-col">
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-medium text-gray-600 truncate">{family?.label ?? "Hotel"}</p>
                    <p className="text-xs text-gray-400 truncate">{hotel.name}</p>
                  </div>
                  <iframe
                    src={embedUrl(hotel)}
                    className="w-full"
                    style={{ height: 240, border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={hotel.name}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
