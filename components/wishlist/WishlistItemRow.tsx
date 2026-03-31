"use client";

import { useState } from "react";
import {
  deleteWishlistItem,
  toggleWishlistDone,
  updateWishlistItem,
} from "@/app/actions/wishlist";
import { FAMILY_MEMBERS, LITHUANIAN_CITIES, type WishlistItem } from "@/lib/types";

const CATEGORY_STYLES: Record<string, string> = {
  sight: "bg-green-100 text-green-700",
  food: "bg-orange-100 text-orange-700",
  activity: "bg-blue-100 text-blue-700",
  other: "bg-gray-100 text-gray-600",
};

const CATEGORY_LABELS: Record<string, string> = {
  sight: "Sight",
  food: "Food",
  activity: "Activity",
  other: "Other",
};

export default function WishlistItemRow({ item }: { item: WishlistItem }) {
  const [editing, setEditing] = useState(false);
  const done = item.is_done === 1;

  async function handleToggle() {
    await toggleWishlistDone(item.id, item.is_done);
  }

  async function handleDelete() {
    await deleteWishlistItem(item.id);
  }

  async function handleUpdate(formData: FormData) {
    await updateWishlistItem(item.id, formData);
    setEditing(false);
  }

  if (editing) {
    return (
      <form
        action={handleUpdate}
        className="bg-amber-50 rounded border border-amber-100 p-3 space-y-2"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2">
            <input
              type="text"
              name="title"
              defaultValue={item.title}
              required
              placeholder="Title *"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <select
            name="category"
            defaultValue={item.category}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="sight">Sight</option>
            <option value="food">Food</option>
            <option value="activity">Activity</option>
            <option value="other">Other</option>
          </select>
          <select
            name="city"
            defaultValue={item.city ?? ""}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Any / Unknown</option>
            {LITHUANIAN_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="text"
            name="description"
            defaultValue={item.description ?? ""}
            placeholder="Description"
            className="sm:col-span-2 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="url"
            name="url"
            defaultValue={item.url ?? ""}
            placeholder="Link (https://...)"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <select
            name="added_by"
            defaultValue={item.added_by ?? ""}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Who?</option>
            {FAMILY_MEMBERS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-3 py-1.5 bg-amber-500 text-white rounded text-xs hover:bg-amber-600">Save</button>
          <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 text-gray-500 rounded text-xs hover:bg-gray-100">Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className={`flex items-start gap-3 py-3 group ${done ? "opacity-50" : ""}`}>
      <form action={handleToggle} className="mt-0.5 shrink-0">
        <button
          type="submit"
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            done
              ? "bg-green-500 border-green-500 text-white"
              : "border-gray-300 hover:border-amber-400"
          }`}
          title={done ? "Mark undone" : "Mark done"}
        >
          {done && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </form>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium text-gray-800 ${done ? "line-through" : ""}`}>
            {item.title}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${CATEGORY_STYLES[item.category]}`}>
            {CATEGORY_LABELS[item.category]}
          </span>
          {item.city && (
            <span className="text-xs text-gray-400">{item.city}</span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-600 hover:underline"
            >
              Link
            </a>
          )}
          {item.added_by && (
            <span className="text-xs text-gray-400">— {item.added_by}</span>
          )}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-1 text-gray-400 hover:text-amber-500 rounded"
          title="Edit"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <form action={handleDelete}>
          <button type="submit" className="p-1 text-gray-400 hover:text-red-500 rounded" title="Delete">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
