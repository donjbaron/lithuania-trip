"use client";

import dynamic from "next/dynamic";
import type { Accommodation } from "@/lib/types";

const GoogleDayMap = dynamic(() => import("./GoogleDayMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] bg-gray-100 rounded-xl flex items-center justify-center text-sm text-gray-400">
      Loading map…
    </div>
  ),
});

export default function DayMapWrapper({ hotels }: { hotels: Accommodation[] }) {
  return <GoogleDayMap hotels={hotels} />;
}
