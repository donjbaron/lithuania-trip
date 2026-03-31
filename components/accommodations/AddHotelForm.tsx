"use client";

import { useState, useRef } from "react";
import { addAccommodation } from "@/app/actions/accommodations";
import { FAMILY_MEMBERS, FAMILIES, LITHUANIAN_CITIES, CITY_COORDS } from "@/lib/types";

export default function AddHotelForm() {
  const [open, setOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addAccommodation(formData);
    formRef.current?.reset();
    setSelectedCity("");
    setOpen(false);
  }

  const defaultCoords = selectedCity ? CITY_COORDS[selectedCity] : null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
      >
        + Add Hotel / Accommodation
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-3"
    >
      <h3 className="font-medium text-gray-800">Add Accommodation</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">For which family *</label>
          <select
            name="family_group"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Select family...</option>
            {FAMILIES.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
            <option value="all">All Families (shared)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">City *</label>
          <select
            name="city"
            required
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Select city...</option>
            {LITHUANIAN_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hotel / Place Name *</label>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Stikliai Hotel"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Check-in *</label>
          <input
            type="date"
            name="check_in"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Check-out *</label>
          <input
            type="date"
            name="check_out"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Address</label>
          <input
            type="text"
            name="address"
            placeholder="Street address"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Booking Ref</label>
          <input
            type="text"
            name="booking_ref"
            placeholder="Confirmation #"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Booking URL</label>
          <input
            type="url"
            name="booking_url"
            placeholder="https://..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <textarea
            name="notes"
            rows={2}
            placeholder="Parking, special instructions, etc."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
        </div>

        {/* Map coordinates — pre-filled from city, can override */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Lat{" "}
            <span className="text-gray-400">(auto-filled from city)</span>
          </label>
          <input
            type="number"
            step="any"
            name="lat"
            placeholder={defaultCoords ? String(defaultCoords[0]) : "e.g. 54.687"}
            defaultValue={defaultCoords ? defaultCoords[0] : ""}
            key={selectedCity + "-lat"}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Lng{" "}
            <span className="text-gray-400">(auto-filled from city)</span>
          </label>
          <input
            type="number"
            step="any"
            name="lng"
            placeholder={defaultCoords ? String(defaultCoords[1]) : "e.g. 25.279"}
            defaultValue={defaultCoords ? defaultCoords[1] : ""}
            key={selectedCity + "-lng"}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
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
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="px-4 py-2 bg-amber-500 text-white rounded text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          Add Accommodation
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
