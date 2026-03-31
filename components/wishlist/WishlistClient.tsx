"use client";

import { useState } from "react";
import { type WishlistItem } from "@/lib/types";
import WishlistItemRow from "./WishlistItemRow";
import AddWishlistForm from "./AddWishlistForm";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "sight", label: "Sights" },
  { value: "food", label: "Food" },
  { value: "activity", label: "Activities" },
  { value: "other", label: "Other" },
];

export default function WishlistClient({ items }: { items: WishlistItem[] }) {
  const [filter, setFilter] = useState("all");
  const [showDone, setShowDone] = useState(false);

  const filtered = items.filter((item) => {
    if (filter !== "all" && item.category !== filter) return false;
    if (!showDone && item.is_done) return false;
    return true;
  });

  const doneCount = items.filter((i) => i.is_done).length;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-amber-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
            {f.value === "all" && (
              <span className="ml-1 opacity-70">
                ({items.filter((i) => !i.is_done || showDone).length})
              </span>
            )}
          </button>
        ))}
        {doneCount > 0 && (
          <button
            onClick={() => setShowDone(!showDone)}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600"
          >
            {showDone ? `Hide completed (${doneCount})` : `Show completed (${doneCount})`}
          </button>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-100 px-4">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            {items.length === 0 ? "No items yet" : "No items match this filter"}
          </p>
        ) : (
          filtered.map((item) => <WishlistItemRow key={item.id} item={item} />)
        )}
      </div>

      <AddWishlistForm />
    </div>
  );
}
