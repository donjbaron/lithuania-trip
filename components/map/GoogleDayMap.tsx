"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Accommodation } from "@/lib/types";
import { FAMILIES } from "@/lib/types";

const FAMILY_COLORS: Record<string, string> = {
  family1: "#F59E0B",
  family2: "#3B82F6",
  family3: "#16A34A",
};

const LITHUANIA_CENTER = { lat: 55.169, lng: 23.881 };

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    _gmapsLoading?: Promise<void>;
  }
}

function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (window._gmapsLoading) return window._gmapsLoading;

  window._gmapsLoading = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return window._gmapsLoading;
}

export default function GoogleDayMap({ hotels }: { hotels: Accommodation[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  const drawMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const valid = hotels.filter((h) => h.lat != null && h.lng != null);
    if (valid.length === 0) return;

    // Spread pins that share the same location so they don't stack
    const OFFSET = 0.0004; // ~40 metres
    const positioned = valid.map((hotel, i) => {
      const dupes = valid.filter(
        (h) =>
          Math.abs(h.lat! - hotel.lat!) < 0.00005 &&
          Math.abs(h.lng! - hotel.lng!) < 0.00005
      );
      if (dupes.length < 2) return { hotel, lat: hotel.lat!, lng: hotel.lng! };
      const idx = dupes.indexOf(hotel);
      const angle = (2 * Math.PI * idx) / dupes.length - Math.PI / 2;
      return {
        hotel,
        lat: hotel.lat! + OFFSET * Math.sin(angle),
        lng: hotel.lng! + OFFSET * Math.cos(angle),
      };
    });

    const bounds = new window.google.maps.LatLngBounds();

    positioned.forEach(({ hotel, lat, lng }) => {
      const family = FAMILIES.find((f) => f.key === hotel.family_group);
      const color = FAMILY_COLORS[hotel.family_group ?? ""] ?? "#6B7280";
      const label = family?.label ?? "Hotel";

      const pinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 28 16 28s16-17 16-28C32 7.163 24.837 0 16 0z"
            fill="${color}" stroke="white" stroke-width="2"/>
          <text x="16" y="21" text-anchor="middle" fill="white"
            font-family="system-ui,sans-serif" font-size="12" font-weight="bold">
            ${label.charAt(0)}
          </text>
        </svg>`;

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map,
        title: hotel.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg)}`,
          scaledSize: new window.google.maps.Size(32, 44),
          anchor: new window.google.maps.Point(16, 44),
          labelOrigin: new window.google.maps.Point(16, 16),
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="font-family:system-ui,sans-serif;padding:2px 0">
            <div style="font-weight:600;font-size:13px;color:#111">${hotel.name}</div>
            <div style="font-size:11px;color:#666;margin-top:2px">${label}${hotel.address ? ` · ${hotel.address}` : ""}</div>
          </div>
        `,
      });

      marker.addListener("click", () => infoWindow.open(map, marker));
      markersRef.current.push(marker);
      bounds.extend({ lat, lng });
    });

    if (valid.length === 1) {
      map.setCenter({ lat: valid[0].lat!, lng: valid[0].lng! });
      map.setZoom(15);
    } else {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [hotels]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    loadGoogleMaps().then(() => {
      if (cancelled || !containerRef.current) return;
      mapRef.current = new window.google.maps.Map(containerRef.current, {
        center: LITHUANIA_CENTER,
        zoom: 7,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER,
        },
      });
      drawMarkers();
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current && window.google?.maps) drawMarkers();
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
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: FAMILY_COLORS[f.key] }} />
              <span className="text-xs text-gray-500">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div ref={containerRef} style={{ height: 320, width: "100%" }}>
        {hotels.filter((h) => h.lat != null).length === 0 && (
          <div className="h-full flex items-center justify-center text-sm text-gray-400 bg-gray-50">
            Add hotels to see them on the map
          </div>
        )}
      </div>
    </div>
  );
}
