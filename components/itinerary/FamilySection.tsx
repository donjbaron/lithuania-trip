"use client";

import Image from "next/image";
import {
  type Accommodation,
  type ItineraryItem,
  FAMILIES,
  type FamilyGroup,
} from "@/lib/types";

interface Props {
  familyKey: FamilyGroup;
  dayId: number;
  dayDate: string;
  items: ItineraryItem[];
  hotel: Accommodation | null;
}

export default function FamilySection({ familyKey, dayId, items, hotel }: Props) {
  const family = FAMILIES.find((f) => f.key === familyKey)!;

  return (
    <div className={`rounded-xl border ${family.borderClass} overflow-hidden flex flex-col`}>
      {/* Header */}
      <div className={`${family.headerClass} text-white px-4 py-3 flex items-center gap-3`}>
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/40 shrink-0">
          <Image
            src={`/families/${family.key}.png`}
                  unoptimized
            alt={family.label}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{family.label}</h3>
          <p className="text-xs opacity-80 mt-0.5">{family.members}</p>
        </div>
      </div>

      {/* Hotel */}
      <div className={`${family.bgClass} px-4 py-3 border-b ${family.borderClass}`}>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Staying at</p>
        {hotel ? (
          <div>
            <p className="font-semibold text-gray-800 text-sm">{hotel.name}</p>
            {hotel.address && <p className="text-xs text-gray-500 mt-0.5">{hotel.address}</p>}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No hotel for this night</p>
        )}
      </div>

    </div>
  );
}
