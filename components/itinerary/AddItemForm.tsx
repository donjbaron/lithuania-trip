"use client";

import { useRef, useState } from "react";
import { addItem } from "@/app/actions/itinerary";
import { FAMILY_MEMBERS, type FamilyGroup } from "@/lib/types";

interface Props {
  dayId: number;
  familyGroup: FamilyGroup | null;
  label?: string;
}

export default function AddItemForm({ dayId, familyGroup, label = "activity" }: Props) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addItem(dayId, familyGroup, formData);
    formRef.current?.reset();
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium mt-2 px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-amber-400 hover:text-amber-600 transition-colors"
      >
        + Add {label}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="mt-2 bg-white rounded-lg p-3 border border-gray-200 shadow-sm space-y-2"
    >
      <div className="flex gap-2">
        <input
          type="time"
          name="time_slot"
          className="w-28 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <input
          type="text"
          name="title"
          placeholder={`${label.charAt(0).toUpperCase() + label.slice(1)} *`}
          required
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          name="notes"
          placeholder="Notes (optional)"
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <select
          name="added_by"
          className="w-28 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">Who?</option>
          {FAMILY_MEMBERS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-3 py-1.5 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-600 transition-colors"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-gray-500 rounded text-xs hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
