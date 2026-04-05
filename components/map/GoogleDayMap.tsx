"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Accommodation, WishlistItem, Restaurant } from "@/lib/types";
import { FAMILIES, CITY_COORDS } from "@/lib/types";

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

/** Draws an image into a circular canvas and returns a data URL. Falls back to null on error. */
function makeCircularIcon(src: string, size = 44, stepNumber?: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const r = size / 2;
      // White background circle
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      // Clip to circle and draw image
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r - 3, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 3, 3, size - 6, size - 6);
      ctx.restore();
      // Amber border
      ctx.beginPath();
      ctx.arc(r, r, r - 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 3;
      ctx.stroke();
      // Step number badge (bottom-right)
      if (stepNumber != null) {
        const br = size * 0.28;
        const bx = size - br + 2;
        const by = size - br + 2;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = "#1D4ED8";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.round(br * 1.2)}px system-ui,sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(stepNumber), bx, by + 1);
      }
      resolve(canvas.toDataURL());
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Numbered pin SVG for route steps without an image. */
function makeNumberedPinSvg(stepNumber: number): string {
  const label = String(stepNumber);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="50" viewBox="0 0 38 50">
    <path d="M19 0C8.507 0 0 8.507 0 19c0 12.426 19 31 19 31s19-18.574 19-31C38 8.507 29.493 0 19 0z"
      fill="#1D4ED8" stroke="white" stroke-width="2.5"/>
    <circle cx="19" cy="19" r="11" fill="white" opacity="0.2"/>
    <text x="19" y="25" text-anchor="middle" fill="white"
      font-family="system-ui,sans-serif" font-size="${label.length > 1 ? 13 : 15}" font-weight="bold">${label}</text>
  </svg>`;
}

function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (window._gmapsLoading) return window._gmapsLoading;

  window._gmapsLoading = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return window._gmapsLoading;
}

export default function GoogleDayMap({ hotels, activities, routeIds, routePoints, restaurantsForDay }: {
  hotels: Accommodation[];
  activities: WishlistItem[];
  routeIds: number[];
  routePoints?: { lat: number; lng: number }[];
  restaurantsForDay?: Restaurant[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const directionsRendererRef = useRef<any>(null);

  const drawMarkers = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    if (directionsRendererRef.current) { directionsRendererRef.current.setMap(null); directionsRendererRef.current = null; }

    const validHotels = hotels.filter((h) => h.lat != null && h.lng != null);

    // Spread hotel pins that share the same location
    const OFFSET = 0.0004;
    const positionedHotels = validHotels.map((hotel) => {
      const dupes = validHotels.filter(
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

    // Geocode activities that have an address but no lat/lng
    const geocodeCache = new Map<string, { lat: number; lng: number } | null>();
    const toGeocode = activities.filter(
      (a) => (a.lat == null || a.lng == null) && a.address
    );
    await Promise.all(
      toGeocode.map(async (a) => {
        const key = a.address!;
        if (geocodeCache.has(key)) return;
        geocodeCache.set(key, null);
        try {
          await new Promise<void>((resolve) => {
            new window.google.maps.Geocoder().geocode(
              { address: `${a.address}, Lithuania` },
              (results: any[], status: string) => {
                if (status === "OK" && results?.[0]?.geometry?.location) {
                  geocodeCache.set(key, {
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng(),
                  });
                }
                resolve();
              }
            );
          });
        } catch { /* ignore */ }
      })
    );

    // Activity markers: precise coords > geocoded address > city center
    const activitiesWithCoords = activities
      .map((a) => {
        if (a.lat != null && a.lng != null) {
          return { activity: a, lat: a.lat, lng: a.lng, cityKey: a.city ?? "Lithuania", precise: true };
        }
        if (a.address) {
          const geo = geocodeCache.get(a.address);
          if (geo) return { activity: a, lat: geo.lat, lng: geo.lng, cityKey: a.city ?? "Lithuania", precise: true };
        }
        const cityKey = Object.keys(CITY_COORDS).find(
          (k) => k.toLowerCase() === (a.city ?? "").toLowerCase()
        );
        if (!cityKey) return null;
        const [lat, lng] = CITY_COORDS[cityKey];
        return { activity: a, lat, lng, cityKey, precise: false };
      })
      .filter(Boolean) as { activity: WishlistItem; lat: number; lng: number; cityKey: string; precise: boolean }[];

    const bounds = new window.google.maps.LatLngBounds();
    const hasPoints = validHotels.length > 0 || activitiesWithCoords.length > 0;
    if (!hasPoints) return;

    // Build step-number lookup for route mode
    const stepByActivityId = new Map<number, number>();
    routeIds.forEach((id, idx) => stepByActivityId.set(id, idx + 1));
    const inRoute = routeIds.length > 1;

    // Pre-load circular image icons for activities that have images
    const iconCache = new Map<string, string>();
    await Promise.all(
      activitiesWithCoords
        .filter(({ activity }) => activity.image_url)
        .map(async ({ activity }) => {
          const step = inRoute ? stepByActivityId.get(activity.id) : undefined;
          const cacheKey = `${activity.image_url!}__${step ?? ""}`;
          if (!iconCache.has(cacheKey)) {
            const dataUrl = await makeCircularIcon(activity.image_url!, 44, step);
            if (dataUrl) iconCache.set(cacheKey, dataUrl);
          }
        })
    );

    positionedHotels.forEach(({ hotel, lat, lng }) => {
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

    const fallbackStarSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="#F59E0B" stroke="white" stroke-width="3"/>
        <text x="18" y="23" text-anchor="middle" fill="white"
          font-family="system-ui,sans-serif" font-size="14" font-weight="bold">★</text>
      </svg>`;

    // Group imprecise activities by city for spreading; place precise ones directly
    const imprecise = activitiesWithCoords.filter((a) => !a.precise);
    const byCityKey: Record<string, typeof imprecise> = {};
    for (const item of imprecise) {
      (byCityKey[item.cityKey] ??= []).push(item);
    }
    // Assign spread positions for imprecise activities
    const spreadPositions = new Map<number, { lat: number; lng: number }>();
    const ACTIVITY_SPREAD = 0.003;
    for (const [cityKey, group] of Object.entries(byCityKey)) {
      const [baseLat, baseLng] = CITY_COORDS[cityKey] ?? [group[0].lat, group[0].lng];
      group.forEach(({ activity }, idx) => {
        const cols = Math.ceil(Math.sqrt(group.length));
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        spreadPositions.set(activity.id, {
          lat: baseLat + (row - (Math.ceil(group.length / cols) - 1) / 2) * ACTIVITY_SPREAD,
          lng: baseLng + (col - (cols - 1) / 2) * ACTIVITY_SPREAD,
        });
      });
    }

    const activityPositions = new Map<number, { lat: number; lng: number }>();

    for (const { activity, lat: baseLat, lng: baseLng, cityKey, precise } of activitiesWithCoords) {
      const pos = precise ? { lat: baseLat, lng: baseLng } : spreadPositions.get(activity.id)!;
      const { lat, lng } = pos;
      activityPositions.set(activity.id, { lat, lng });

        const step = inRoute ? stepByActivityId.get(activity.id) : undefined;
        const cacheKey = activity.image_url ? `${activity.image_url}__${step ?? ""}` : undefined;
        const imgDataUrl = cacheKey ? iconCache.get(cacheKey) : undefined;

        let iconUrl: string;
        let iconSize: number;
        let anchorY: number;

        if (imgDataUrl) {
          iconUrl = imgDataUrl;
          iconSize = 44;
          anchorY = iconSize / 2;
        } else if (step != null) {
          iconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(makeNumberedPinSvg(step))}`;
          iconSize = 38;
          anchorY = 50; // pin tip at bottom
        } else {
          iconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(fallbackStarSvg)}`;
          iconSize = 36;
          anchorY = iconSize / 2;
        }

        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map,
          title: activity.title,
          zIndex: step != null ? 100 + step : 1,
          icon: {
            url: iconUrl,
            scaledSize: new window.google.maps.Size(iconSize, step != null && !imgDataUrl ? 50 : iconSize),
            anchor: new window.google.maps.Point(iconSize / 2, anchorY),
          },
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="font-family:system-ui,sans-serif;padding:2px 0;max-width:180px">
              ${activity.image_url ? `<img src="${activity.image_url}" style="width:100%;height:90px;object-fit:cover;border-radius:6px;margin-bottom:6px" />` : ""}
              <div style="font-weight:600;font-size:13px;color:#111">${activity.title}</div>
              <div style="font-size:11px;color:#666;margin-top:2px">${activity.address ?? cityKey}</div>
              <div style="display:flex;gap:8px;margin-top:5px;flex-wrap:wrap">
                ${activity.url ? `<a href="${activity.url}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#D97706;text-decoration:none;">More info ↗</a>` : ""}
                ${activity.wiki_url ? `<a href="${activity.wiki_url}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#3B82F6;text-decoration:none;">Learn More ↗</a>` : ""}
              </div>
            </div>
          `,
        });

        marker.addListener("click", () => infoWindow.open(map, marker));
        markersRef.current.push(marker);
        bounds.extend({ lat, lng });
    }

    // Restaurant markers
    const forkSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r="16" fill="${color}" stroke="white" stroke-width="2.5"/>
      <text x="17" y="22" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="16">🍴</text>
    </svg>`;
    for (const rest of (restaurantsForDay ?? [])) {
      if (rest.lat == null || rest.lng == null) continue;
      const marker = new window.google.maps.Marker({
        position: { lat: rest.lat, lng: rest.lng },
        map,
        title: rest.name,
        zIndex: 50,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(forkSvg("#7C3AED"))}`,
          scaledSize: new window.google.maps.Size(34, 34),
          anchor: new window.google.maps.Point(17, 17),
        },
      });
      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="font-family:system-ui,sans-serif;padding:2px 0;max-width:180px">
          ${rest.image_url ? `<img src="${rest.image_url}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px"/>` : ""}
          <div style="font-weight:600;font-size:13px">${rest.name}</div>
          ${rest.cuisine ? `<div style="font-size:11px;color:#7C3AED;margin-top:2px">${rest.cuisine}</div>` : ""}
          ${rest.address ? `<div style="font-size:11px;color:#666;margin-top:2px">${rest.address}</div>` : ""}
        </div>`,
      });
      marker.addListener("click", () => infoWindow.open(map, marker));
      markersRef.current.push(marker);
      bounds.extend({ lat: rest.lat, lng: rest.lng });
    }

    if (validHotels.length === 1 && activitiesWithCoords.length === 0) {
      map.setCenter({ lat: validHotels[0].lat!, lng: validHotels[0].lng! });
      map.setZoom(15);
    } else {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }

    // Draw route if an ordered list of activity IDs is provided
    const useExplicitPoints = routePoints && routePoints.length > 1;
    if (useExplicitPoints || routeIds.length > 1) {
      const path = useExplicitPoints
        ? routePoints!
        : (routeIds.map((id) => activityPositions.get(id)).filter(Boolean) as { lat: number; lng: number }[]);

      if (path.length > 1) {
        const origin = path[0];
        const destination = path[path.length - 1];
        const waypoints = path.slice(1, -1).map((p) => ({
          location: new window.google.maps.LatLng(p.lat, p.lng),
          stopover: true,
        }));

        const renderer = new window.google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: {
            strokeColor: "#1D4ED8",
            strokeOpacity: 0.75,
            strokeWeight: 5,
          },
        });
        directionsRendererRef.current = renderer;

        new window.google.maps.DirectionsService().route(
          {
            origin,
            destination,
            waypoints,
            travelMode: window.google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result: any, status: string) => {
            if (status === "OK") {
              renderer.setDirections(result);
            } else {
              // Fallback: straight-line dashed polyline
              renderer.setMap(null);
              directionsRendererRef.current = null;
              polylineRef.current = new window.google.maps.Polyline({
                path,
                map,
                geodesic: true,
                strokeColor: "#1D4ED8",
                strokeOpacity: 0.7,
                strokeWeight: 4,
                icons: [{
                  icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 4, strokeColor: "#fff", strokeWeight: 1.5, fillColor: "#1D4ED8", fillOpacity: 1 },
                  offset: "50%",
                  repeat: "80px",
                }],
              });
            }
          }
        );
      }
    }
  }, [hotels, activities, routeIds, routePoints, restaurantsForDay]);

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
        styles: [
          { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
          { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
          { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
          { featureType: "landscape", elementType: "labels", stylers: [{ visibility: "off" }] },
          { featureType: "administrative", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9e8f5" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#f0ede8" }] },
          { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e8dfc8" }] },
          { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#eaf4e8" }] },
        ],
      });
      drawMarkers().catch(console.error);
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
      if (directionsRendererRef.current) { directionsRendererRef.current.setMap(null); directionsRendererRef.current = null; }
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current && window.google?.maps) drawMarkers().catch(console.error);
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
        {hotels.filter((h) => h.lat != null).length === 0 && activities.filter((a) => a.city && CITY_COORDS[a.city]).length === 0 && (
          <div className="h-full flex items-center justify-center text-sm text-gray-400 bg-gray-50">
            Add hotels or activities to see them on the map
          </div>
        )}
      </div>
    </div>
  );
}
