"use client";

import { useState } from "react";
import { deleteDay, updateDay } from "@/app/actions/itinerary";
import { type DayWithItems } from "@/lib/types";
import DayItemRow from "./DayItemRow";
import AddItemForm from "./AddItemForm";

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(y, m - 1, d));
}

export default function DayCard({ day }: { day: DayWithItems }) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this day and all its activities?")) return;
    await deleteDay(day.id);
  }

  async function handleUpdateHeader(formData: FormData) {
    await updateDay(day.id, formData);
    setEditingHeader(false);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        {editingHeader ? (
          <form action={handleUpdateHeader} className="flex flex-1 gap-2 items-center">
            <input
              type="date"
              name="trip_date"
              defaultValue={day.trip_date}
              required
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input
              type="text"
              name="label"
              defaultValue={day.label ?? ""}
              placeholder="Day label"
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button type="submit" className="px-2 py-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600">
              Save
            </button>
            <button type="button" onClick={() => setEditingHeader(false)} className="px-2 py-1 text-gray-500 rounded text-xs hover:bg-gray-100">
              Cancel
            </button>
          </form>
        ) : (
          <>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex-1 flex items-center gap-2 text-left"
            >
              <span className="text-sm font-semibold text-gray-800">
                {formatDate(day.trip_date)}
              </span>
              {day.label && (
                <span className="text-sm text-gray-500">— {day.label}</span>
              )}
              <span className="ml-auto text-xs text-gray-400">
                {day.items.length > 0 && `${day.items.length} item${day.items.length !== 1 ? "s" : ""}`}
              </span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? "-rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={() => setEditingHeader(true)}
              className="p-1 text-gray-400 hover:text-amber-500 rounded"
              title="Edit day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <form action={handleDelete}>
              <button type="submit" className="p-1 text-gray-400 hover:text-red-500 rounded" title="Delete day">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </form>
          </>
        )}
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 py-3">
          {day.items.length === 0 && (
            <p className="text-sm text-gray-400 mb-2">No activities yet</p>
          )}
          <div className="divide-y divide-gray-100">
            {day.items
              .sort((a, b) => {
                if (a.time_slot && b.time_slot) return a.time_slot.localeCompare(b.time_slot);
                if (a.time_slot) return -1;
                if (b.time_slot) return 1;
                return a.sort_order - b.sort_order;
              })
              .map((item) => (
                <DayItemRow key={item.id} item={item} />
              ))}
          </div>
          <AddItemForm dayId={day.id} familyGroup={null} />
        </div>
      )}
    </div>
  );
}
