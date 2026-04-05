"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { FAMILIES, type WishlistItem } from "@/lib/types";
import { deleteActivity, toggleInterest, updateActivity, setAllInterest, moveActivitiesToDay, unassignActivityDate, reorderActivities } from "@/app/actions/activities";

const CITIES = ["Vilnius", "Kaunas", "Trakai", "Klaipeda", "Siauliai", "Palanga", "Other"];
const TRIP_DATES = [
  { value: "2026-07-31", label: "Fri Jul 31 — Day 1" },
  { value: "2026-08-01", label: "Sat Aug 1 — Day 2" },
  { value: "2026-08-02", label: "Sun Aug 2 — Day 3" },
  { value: "2026-08-03", label: "Mon Aug 3 — Day 4" },
  { value: "2026-08-04", label: "Tue Aug 4 — Day 5" },
  { value: "2026-08-05", label: "Wed Aug 5 — Day 6" },
  { value: "2026-08-06", label: "Thu Aug 6 — Day 7" },
];

const DATE_LABEL: Record<string, { day: string; weekday: string; dayNum: number }> = {
  "2026-07-31": { day: "Jul 31", weekday: "Friday",    dayNum: 1 },
  "2026-08-01": { day: "Aug 1",  weekday: "Saturday",  dayNum: 2 },
  "2026-08-02": { day: "Aug 2",  weekday: "Sunday",    dayNum: 3 },
  "2026-08-03": { day: "Aug 3",  weekday: "Monday",    dayNum: 4 },
  "2026-08-04": { day: "Aug 4",  weekday: "Tuesday",   dayNum: 5 },
  "2026-08-05": { day: "Aug 5",  weekday: "Wednesday", dayNum: 6 },
  "2026-08-06": { day: "Aug 6",  weekday: "Thursday",  dayNum: 7 },
};

const CITY_BADGE: Record<string, string> = {
  Vilnius: "bg-amber-100 text-amber-700",
  Kaunas:  "bg-blue-100 text-blue-700",
  Palanga: "bg-cyan-100 text-cyan-700",
  Trakai:  "bg-green-100 text-green-700",
};

function formatTime12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(
    new Date(y, m - 1, day)
  );
}

function InterestVote({ item, familyKey, current }: {
  item: WishlistItem;
  familyKey: "family1" | "family2" | "family3";
  current: number;
}) {
  const family = FAMILIES.find((f) => f.key === familyKey)!;
  const activeColors: Record<string, string> = {
    family1: "bg-amber-50 border-amber-400 text-amber-700",
    family2: "bg-blue-50 border-blue-400 text-blue-700",
    family3: "bg-green-50 border-green-500 text-green-700",
  };
  return (
    <form action={toggleInterest.bind(null, item.id, familyKey, current)} draggable={false}>
      <button type="submit" draggable={false}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
          current ? activeColors[familyKey] : "bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
        }`}
      >
        <div className={`w-5 h-5 rounded-full overflow-hidden shrink-0 ring-1 ${current ? "ring-current" : "ring-gray-300"}`}>
          <Image src={`/families/${familyKey}.png`} unoptimized alt={family.label} width={20} height={20} className="w-full h-full object-cover" />
        </div>
        <span>{family.label}</span>
        {current
          ? <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
          : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
        }
      </button>
    </form>
  );
}

// Drag insert indicator – shown between rows
function InsertLine() {
  return <div className="h-0.5 mx-3 bg-blue-400 rounded-full pointer-events-none" />;
}

function ActivityRow({
  item,
  isDragging,
  showInsertBefore,
  showInsertAfter,
  onDragStart,
  onDragEnd,
  onDragOver,
}: {
  item: WishlistItem;
  isDragging: boolean;
  showInsertBefore: boolean;
  showInsertAfter: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (above: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  if (editing) {
    return (
      <form action={async (fd) => { await updateActivity(item.id, fd); setEditing(false); }}
        draggable={false} className="px-4 py-3 space-y-2 bg-amber-50/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2">
            <input type="text" name="name" defaultValue={item.title} required placeholder="Name"
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <select name="city" defaultValue={item.city ?? ""} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="">Any city</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="activity_date" defaultValue={item.activity_date ?? ""} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
            <option value="">Any day</option>
            {TRIP_DATES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <input type="time" name="time_slot" defaultValue={item.time_slot ?? ""} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
          <input type="url" name="url" defaultValue={item.url ?? ""} placeholder="URL" className="sm:col-span-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <input type="text" name="address" defaultValue={item.address ?? ""} placeholder="Address" className="sm:col-span-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div className="flex gap-2">
          <button type="submit" draggable={false} className="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600">Save</button>
          <button type="button" draggable={false} onClick={() => setEditing(false)} className="px-3 py-1 text-gray-500 rounded-lg text-xs hover:bg-gray-100">Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <>
      {showInsertBefore && <InsertLine />}
      <div
        ref={rowRef}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", String(item.id));
          e.dataTransfer.effectAllowed = "move";
          // Small delay so the drag ghost renders before opacity changes
          setTimeout(onDragStart, 0);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation(); // handle at row level; we'll set zone state explicitly
          const rect = rowRef.current?.getBoundingClientRect();
          if (rect) onDragOver(e.clientY < rect.top + rect.height / 2);
        }}
        className={`flex items-stretch divide-x divide-gray-100 cursor-grab active:cursor-grabbing select-none transition-opacity ${
          isDragging ? "opacity-30" : "hover:bg-gray-50/60"
        }`}
      >
        {/* Drag handle */}
        <div className="flex items-center justify-center w-8 shrink-0 text-gray-300 hover:text-gray-400">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM7 8a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zm-6 6a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z"/>
          </svg>
        </div>

        {item.image_url && (
          <div className="w-16 sm:w-20 shrink-0 pointer-events-none">
            <img src={item.image_url} alt={item.title} draggable={false} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex-1 min-w-0 px-4 py-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 pointer-events-none">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                {item.time_slot && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 tabular-nums">
                    {formatTime12(item.time_slot)}
                  </span>
                )}
                {item.city && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CITY_BADGE[item.city] ?? "bg-gray-100 text-gray-500"}`}>
                    {item.city}
                  </span>
                )}
                {item.activity_date && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {formatDate(item.activity_date)}
                  </span>
                )}
              </div>
              {item.url && (
                <p className="text-xs text-amber-600 mt-0.5 truncate">{item.url}</p>
              )}
            </div>
            {/* Action buttons – pointer-events kept so they remain clickable */}
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button type="button" draggable={false} onClick={() => setEditing(true)}
                className="p-1.5 text-gray-300 hover:text-amber-500 transition-colors rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <form action={deleteActivity.bind(null, item.id)} draggable={false}>
                <button type="submit" draggable={false}
                  className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs text-gray-400 self-center mr-1">Who&apos;s in?</span>
            {(() => {
              const allOn = item.interested_family1 && item.interested_family2 && item.interested_family3;
              return (
                <form action={setAllInterest.bind(null, item.id, allOn ? 0 : 1)} draggable={false}>
                  <button type="submit" draggable={false}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      allOn ? "bg-gray-800 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"
                    }`}>
                    <span>All</span>
                    {allOn
                      ? <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                    }
                  </button>
                </form>
              );
            })()}
            <InterestVote item={item} familyKey="family1" current={item.interested_family1} />
            <InterestVote item={item} familyKey="family2" current={item.interested_family2} />
            <InterestVote item={item} familyKey="family3" current={item.interested_family3} />
          </div>
        </div>
      </div>
      {showInsertAfter && <InsertLine />}
    </>
  );
}

export default function ActivityList({ items }: { items: WishlistItem[] }) {
  const [dragId, setDragId] = useState<number | null>(null);
  // dropTarget: which day zone is highlighted; insertBefore: id to insert before, or "end"
  const [dropTarget, setDropTarget] = useState<string | "unassigned" | null>(null);
  const [insertBefore, setInsertBefore] = useState<number | "end" | null>(null);

  const dated = Object.keys(DATE_LABEL).sort();
  const allDayGroups = dated.map((date) => ({
    date,
    meta: DATE_LABEL[date],
    activities: items.filter((i) => i.activity_date === date),
  }));
  const visibleDayGroups = dragId !== null ? allDayGroups : allDayGroups.filter((g) => g.activities.length > 0);
  const undated = items.filter((i) => !i.activity_date);
  const showUndated = undated.length > 0 || dragId !== null;

  function clearDragState() {
    setDragId(null);
    setDropTarget(null);
    setInsertBefore(null);
  }

  async function handleDrop(e: React.DragEvent, targetDate: string | null) {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (!id) { clearDragState(); return; }

    const activity = items.find((i) => i.id === id);
    const currentDate = activity?.activity_date ?? null;

    if (currentDate === targetDate) {
      // Same day → reorder
      const dayItems = items.filter((i) => i.activity_date === targetDate);
      const rest = dayItems.filter((i) => i.id !== id);
      let newOrder: number[];
      if (!insertBefore || insertBefore === "end") {
        newOrder = [...rest.map((i) => i.id), id];
      } else {
        const idx = rest.findIndex((i) => i.id === insertBefore);
        const ids = rest.map((i) => i.id);
        ids.splice(idx === -1 ? ids.length : idx, 0, id);
        newOrder = ids;
      }
      await reorderActivities(newOrder);
    } else if (targetDate === null) {
      await unassignActivityDate(id);
    } else {
      await moveActivitiesToDay([id], targetDate);
    }

    clearDragState();
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-base">No activities yet</p>
        <p className="text-sm mt-1">Add something to do below</p>
      </div>
    );
  }

  function renderGroup(
    groupDate: string | null,
    groupKey: string,
    groupItems: WishlistItem[],
  ) {
    const isOver = dropTarget === groupKey;
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          // Only update if not handled by a child row (rows call stopPropagation)
          setDropTarget(groupKey);
          setInsertBefore("end");
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDropTarget(null);
            setInsertBefore(null);
          }
        }}
        onDrop={(e) => handleDrop(e, groupDate)}
        className={`rounded-xl border shadow-sm overflow-hidden transition-all bg-white ${
          isOver ? "border-amber-400 ring-2 ring-amber-200" : "border-gray-200"
        }`}
      >
        {groupItems.length === 0 ? (
          <div className={`px-4 py-5 text-center text-xs ${isOver ? "text-amber-600 font-medium" : "text-gray-300 italic"}`}>
            {isOver ? "Drop here" : "No activities — drag one here"}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groupItems.map((item, idx) => {
              const next = groupItems[idx + 1];
              return (
                <ActivityRow
                  key={item.id}
                  item={item}
                  isDragging={dragId === item.id}
                  showInsertBefore={insertBefore === item.id && dragId !== item.id && dropTarget === groupKey}
                  showInsertAfter={!next && insertBefore === "end" && dropTarget === groupKey && dragId !== null && dragId !== item.id}
                  onDragStart={() => { setDragId(item.id); setDropTarget(groupKey); }}
                  onDragEnd={clearDragState}
                  onDragOver={(above) => {
                    setDropTarget(groupKey);
                    if (above) {
                      setInsertBefore(item.id);
                    } else {
                      setInsertBefore(next ? next.id : "end");
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dragId !== null && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
          Drag to reorder within a day, or drop on another day to move it
        </p>
      )}

      {visibleDayGroups.map(({ date, meta, activities }) => {
        const cities = [...new Set(activities.map((a) => a.city).filter(Boolean))];
        return (
          <div key={date}>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white bg-gray-700 rounded-full px-2.5 py-1 leading-none">
                  Day {meta.dayNum}
                </span>
                <span className="text-sm font-semibold text-gray-700">{meta.weekday}</span>
                <span className="text-sm text-gray-400">{meta.day}</span>
              </div>
              {cities.length > 0 && (
                <div className="flex gap-1.5">
                  {cities.map((city) => (
                    <span key={city} className={`text-xs font-medium px-2 py-0.5 rounded-full ${CITY_BADGE[city!] ?? "bg-gray-100 text-gray-500"}`}>
                      {city}
                    </span>
                  ))}
                </div>
              )}
              {activities.length > 0 && (
                <span className="text-xs text-gray-400 ml-auto">
                  {activities.length} activit{activities.length !== 1 ? "ies" : "y"}
                </span>
              )}
            </div>
            {renderGroup(date, date, activities)}
          </div>
        );
      })}

      {showUndated && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">No date assigned</span>
            {undated.length > 0 && (
              <span className="text-xs text-gray-400">{undated.length} activit{undated.length !== 1 ? "ies" : "y"}</span>
            )}
          </div>
          {renderGroup(null, "unassigned", undated)}
        </div>
      )}
    </div>
  );
}
