"use client";

import { useState, useRef } from "react";
import { addDay } from "@/app/actions/itinerary";
import { LITHUANIAN_CITIES } from "@/lib/types";

export default function AddDayForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addDay(formData);
    formRef.current?.reset();
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
      >
        + Add Day
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
    >
      <h3 className="font-medium text-gray-800 mb-3">Add a Day</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date *</label>
          <input
            type="date"
            name="trip_date"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">City</label>
          <select
            name="city"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Select city…</option>
            {LITHUANIAN_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Label (optional)</label>
          <input
            type="text"
            name="label"
            placeholder="e.g. Arrival day"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          type="submit"
          className="px-4 py-2 bg-amber-500 text-white rounded text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          Add Day
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
