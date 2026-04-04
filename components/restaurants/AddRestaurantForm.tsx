"use client";

import { useRef } from "react";
import { addRestaurant } from "@/app/actions/restaurants";

const CITIES = ["Vilnius", "Kaunas", "Trakai", "Palanga", "Other"];
const TRIP_DATES = [
  { value: "2026-07-31", label: "Fri Jul 31 — Day 1" },
  { value: "2026-08-01", label: "Sat Aug 1 — Day 2" },
  { value: "2026-08-02", label: "Sun Aug 2 — Day 3" },
  { value: "2026-08-03", label: "Mon Aug 3 — Day 4" },
  { value: "2026-08-04", label: "Tue Aug 4 — Day 5" },
  { value: "2026-08-05", label: "Wed Aug 5 — Day 6" },
  { value: "2026-08-06", label: "Thu Aug 6 — Day 7" },
];

export default function AddRestaurantForm() {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addRestaurant(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Add Restaurant</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input type="text" name="name" required placeholder="e.g. Etno Dvaras, Bernelių Užeiga…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
          <select name="city"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="">Any city</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Meal</label>
          <select name="meal_type"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="">Lunch or Dinner</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Day <span className="text-gray-300">(optional)</span></label>
          <select name="activity_date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="">Any day</option>
            {TRIP_DATES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
          <input type="url" name="url" placeholder="https://…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Address <span className="text-gray-300">(optional)</span></label>
          <input type="text" name="address" placeholder="Street address"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes <span className="text-gray-300">(optional)</span></label>
          <textarea name="notes" placeholder="e.g. Great cepelinai, need reservation…" rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
        </div>
      </div>

      <button type="submit"
        className="mt-4 px-5 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
        Add Restaurant
      </button>
    </form>
  );
}
