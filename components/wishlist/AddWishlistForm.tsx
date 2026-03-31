"use client";

import { useRef, useState } from "react";
import { addWishlistItem } from "@/app/actions/wishlist";
import { FAMILY_MEMBERS, LITHUANIAN_CITIES } from "@/lib/types";

const CATEGORIES = [
  { value: "sight", label: "Sight", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "food", label: "Food", color: "bg-orange-100 text-orange-700 border-orange-300" },
  { value: "activity", label: "Activity", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-700 border-gray-300" },
];

export default function AddWishlistForm() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("sight");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addWishlistItem(formData);
    formRef.current?.reset();
    setCategory("sight");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
      >
        + Add to Wishlist
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-3"
    >
      <h3 className="font-medium text-gray-800">Add to Wishlist</h3>

      <div>
        <label className="block text-xs text-gray-500 mb-2">Category</label>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <label key={cat.value} className="cursor-pointer">
              <input
                type="radio"
                name="category"
                value={cat.value}
                checked={category === cat.value}
                onChange={() => setCategory(cat.value)}
                className="sr-only"
              />
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  category === cat.value
                    ? cat.color + " ring-2 ring-offset-1 ring-amber-400"
                    : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >
                {cat.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Title *</label>
          <input
            type="text"
            name="title"
            required
            placeholder="e.g. Trakai Island Castle"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">City</label>
          <select
            name="city"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Any / Unknown</option>
            {LITHUANIAN_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Added by</label>
          <select
            name="added_by"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Select...</option>
            {FAMILY_MEMBERS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Description / Notes</label>
          <input
            type="text"
            name="description"
            placeholder="Why you want to go, tips, etc."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Link (website, Google Maps, etc.)</label>
          <input
            type="url"
            name="url"
            placeholder="https://..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="px-4 py-2 bg-amber-500 text-white rounded text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          Add to Wishlist
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-gray-600 rounded text-sm hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
