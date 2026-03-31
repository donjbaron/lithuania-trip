"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useCallback } from "react";
import type { Accommodation } from "@/lib/types";
import { FAMILIES } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyLeaflet = any;

const FAMILY_MARKER_COLORS: Record<string, string> = {
  family1: "#F59E0B",
  family2: "#3B82F6",
  family3: "#16A34A",
};

const LITHUANIA_CENTER: [number, number] = [55.169, 23.881];

export default function TripMap({ hotels }: { hotels: Accommodation[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AnyLeaflet>(null);
  const LRef = useRef<AnyLeaflet>(null);
  const markersRef = useRef<AnyLeaflet[]>([]);

  const drawMarkers = useCallback(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach((m: AnyLeaflet) => m.remove());
    markersRef.current = [];

    const valid = hotels.filter((h) => h.lat != null && h.lng != null);
    if (valid.length === 0) return;

    const bounds: [number, number][] = [];

    valid.forEach((hotel) => {
      const family = FAMILIES.find((f) => f.key === hotel.family_group);
      const color = FAMILY_MARKER_COLORS[hotel.family_group ?? ""] ?? "#6B7280";
      const familyLabel = family?.label ?? "All Families";

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:28px;height:28px;border-radius:50% 50% 50% 0;
          background:${color};border:3px solid white;
          transform:rotate(-45deg);
          box-shadow:0 2px 6px rgba(0,0,0,0.35);
        "></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([hotel.lat, hotel.lng], { icon })
        .addTo(map)
        .bindPopup(`<strong>${hotel.name}</strong><br/><span style="color:#6b7280">${familyLabel} · ${hotel.city}</span>`);

      markersRef.current.push(marker);
      bounds.push([hotel.lat!, hotel.lng!]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    } else {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [hotels]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import("leaflet").then((mod) => {
      if (cancelled || !containerRef.current) return;
      const L = mod.default;
      LRef.current = L;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      mapRef.current = L.map(containerRef.current, { zoomSnap: 0.1 }).setView(LITHUANIA_CENTER, 7);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);

      drawMarkers();
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      LRef.current = null;
      markersRef.current = [];
    };
  // drawMarkers intentionally excluded — handled by separate effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw markers whenever hotels change
  useEffect(() => {
    if (mapRef.current && LRef.current) drawMarkers();
  }, [drawMarkers]);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Where we&apos;re staying
        </span>
        <div className="flex gap-3 ml-auto">
          {FAMILIES.map((f) => (
            <div key={f.key} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: FAMILY_MARKER_COLORS[f.key] }} />
              <span className="text-xs text-gray-500">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative" style={{ height: "300px" }}>
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
        {!hotels.some((h) => h.lat != null) && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-white/90 rounded-lg px-4 py-2 text-sm text-gray-500 shadow">
              Add hotels to see them on the map
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
