"use client";

import { useState, useRef } from "react";
import { deleteItem, updateItem } from "@/app/actions/itinerary";
import { FAMILY_MEMBERS, type ItineraryItem } from "@/lib/types";

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 || 12;
  return `${h12}:${m}${ampm}`;
}

export default function DayItemRow({ item }: { item: ItineraryItem }) {
  const [editing, setEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleUpdate(formData: FormData) {
    await updateItem(item.id, formData);
    setEditing(false);
  }

  async function handleDelete() {
    await deleteItem(item.id);
  }

  if (editing) {
    return (
      <form
        ref={formRef}
        action={handleUpdate}
        className="flex flex-col sm:flex-row gap-2 py-2 px-2 bg-amber-50 rounded border border-amber-100"
      >
        <input
          type="time"
          name="time_slot"
          defaultValue={item.time_slot ?? ""}
          className="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <input
          type="text"
          name="title"
          defaultValue={item.title}
          required
          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <input
          type="text"
          name="notes"
          defaultValue={item.notes ?? ""}
          placeholder="Notes"
          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <select
          name="added_by"
          defaultValue={item.added_by ?? ""}
          className="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">Who?</option>
          {FAMILY_MEMBERS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          <button
            type="submit"
            className="px-2 py-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-2 py-1 text-gray-500 rounded text-xs hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start gap-3 py-2 group">
      {item.time_slot && (
        <span className="text-xs font-mono text-amber-600 mt-0.5 w-14 shrink-0">
          {formatTime(item.time_slot)}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-800">{item.title}</span>
        {item.notes && (
          <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>
        )}
        {item.added_by && (
          <span className="text-xs text-gray-400">— {item.added_by}</span>
        )}
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
          <button
            type="submit"
            className="p-1 text-gray-400 hover:text-red-500 rounded"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
