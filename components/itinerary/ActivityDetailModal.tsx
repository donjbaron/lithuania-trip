"use client";

import { useEffect, useState } from "react";
import type { WishlistItem } from "@/lib/types";
import { FAMILIES } from "@/lib/types";

const FAMILY_INTEREST: Record<string, keyof WishlistItem> = {
  family1: "interested_family1",
  family2: "interested_family2",
  family3: "interested_family3",
};

const DURATION_BY_CATEGORY: Record<string, string> = {
  sight:    "1–2 hours",
  activity: "2–4 hours",
  food:     "About 1 hour",
  other:    "Varies",
};

interface WikiSummary {
  extract: string | null;
  thumbnail: string | null;
  highlights: string[];
}

function extractHighlights(extract: string | null): string[] {
  if (!extract) return [];
  // Split into sentences and pick the first 3 informative ones
  const sentences = extract
    .replace(/\([^)]*\)/g, "") // strip parentheticals
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 220);
  return sentences.slice(0, 3);
}

export default function ActivityDetailModal({
  activity,
  onClose,
}: {
  activity: WishlistItem;
  onClose: () => void;
}) {
  const [wiki, setWiki] = useState<WikiSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activity.wiki_url) return;
    const title = activity.wiki_url.split("/wiki/")[1];
    if (!title) return;
    setLoading(true);
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`)
      .then((r) => r.json())
      .then((data) => {
        setWiki({
          extract: data.extract ?? null,
          thumbnail: data.thumbnail?.source ?? null,
          highlights: extractHighlights(data.extract ?? null),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activity.wiki_url]);

  // Close on backdrop click or Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const photo = activity.image_url ?? wiki?.thumbnail ?? null;
  const interested = FAMILIES.filter((f) => activity[FAMILY_INTEREST[f.key]] as number);
  const duration = DURATION_BY_CATEGORY[activity.category ?? "other"] ?? "Varies";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo header */}
        {photo && (
          <div className="relative h-48 sm:h-56 overflow-hidden rounded-t-3xl sm:rounded-t-2xl">
            <img src={photo} alt={activity.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="absolute bottom-3 left-4 right-4">
              <h2 className="text-white text-lg font-bold leading-tight drop-shadow">{activity.title}</h2>
              {activity.city && <p className="text-white/80 text-sm mt-0.5">{activity.city}</p>}
            </div>
          </div>
        )}

        {/* No photo header */}
        {!photo && (
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{activity.title}</h2>
              {activity.city && <p className="text-sm text-gray-500 mt-0.5">{activity.city}</p>}
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="px-5 py-4 space-y-4">
          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {duration}
            </span>
            {activity.address && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {activity.address}
              </span>
            )}
          </div>

          {/* Who's going */}
          {interested.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Going:</span>
              <div className="flex items-center gap-1.5">
                {interested.map((f) => (
                  <div key={f.key} className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full pl-0.5 pr-2 py-0.5">
                    <div className="w-4 h-4 rounded-full overflow-hidden shrink-0">
                      <img src={`/families/${f.key}.png`} alt={f.label} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs text-gray-600">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key highlights from Wikipedia */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Loading details…
            </div>
          )}

          {!loading && wiki?.highlights && wiki.highlights.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">About</p>
              <ul className="space-y-2">
                {wiki.highlights.map((h, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
                    <span className="text-amber-400 mt-1 shrink-0">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!loading && !wiki && activity.description && (
            <p className="text-sm text-gray-700 leading-relaxed">{activity.description}</p>
          )}

          {/* Links */}
          <div className="flex gap-3 flex-wrap pt-1">
            {activity.wiki_url && (
              <a href={activity.wiki_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Wikipedia
              </a>
            )}
            {activity.url && (
              <a href={activity.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-amber-600 font-medium hover:underline">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                More info
              </a>
            )}
            {activity.lat && activity.lng && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${activity.lat},${activity.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-500 font-medium hover:underline">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Map
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
