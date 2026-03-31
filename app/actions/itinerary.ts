"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";

export async function addDay(formData: FormData) {
  const trip_date = formData.get("trip_date") as string;
  const label = (formData.get("label") as string) || null;
  const city = (formData.get("city") as string) || null;
  if (!trip_date) return;

  const db = getDb();
  const maxOrder = db
    .prepare("SELECT MAX(sort_order) as m FROM itinerary_days")
    .get() as { m: number | null };
  const sort_order = (maxOrder.m ?? -1) + 1;

  db.prepare(
    "INSERT INTO itinerary_days (trip_date, label, city, sort_order) VALUES (?, ?, ?, ?)"
  ).run(trip_date, label, city, sort_order);

  revalidatePath("/itinerary", "layout");
}

export async function deleteDay(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM itinerary_days WHERE id = ?").run(id);
  revalidatePath("/itinerary", "layout");
}

export async function updateDay(id: number, formData: FormData) {
  const label = (formData.get("label") as string) || null;
  const trip_date = formData.get("trip_date") as string;
  const city = (formData.get("city") as string) || null;
  const summary = (formData.get("summary") as string) || null;
  const db = getDb();
  db.prepare(
    "UPDATE itinerary_days SET label = ?, trip_date = ?, city = ?, summary = ? WHERE id = ?"
  ).run(label, trip_date, city, summary, id);
  revalidatePath("/itinerary", "layout");
}

export async function addItem(
  dayId: number,
  familyGroup: string | null,
  formData: FormData
) {
  const title = formData.get("title") as string;
  if (!title) return;
  const time_slot = (formData.get("time_slot") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const added_by = (formData.get("added_by") as string) || null;
  const family_group = familyGroup || null;

  const db = getDb();
  const maxOrder = db
    .prepare(
      "SELECT MAX(sort_order) as m FROM itinerary_items WHERE day_id = ?"
    )
    .get(dayId) as { m: number | null };
  const sort_order = (maxOrder.m ?? -1) + 1;

  db.prepare(
    "INSERT INTO itinerary_items (day_id, time_slot, title, notes, added_by, family_group, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(dayId, time_slot, title, notes, added_by, family_group, sort_order);

  revalidatePath("/itinerary", "layout");
}

export async function deleteItem(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM itinerary_items WHERE id = ?").run(id);
  revalidatePath("/itinerary", "layout");
}

export async function updateItem(id: number, formData: FormData) {
  const title = formData.get("title") as string;
  const time_slot = (formData.get("time_slot") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const added_by = (formData.get("added_by") as string) || null;

  const db = getDb();
  db.prepare(
    "UPDATE itinerary_items SET title = ?, time_slot = ?, notes = ?, added_by = ? WHERE id = ?"
  ).run(title, time_slot, notes, added_by, id);

  revalidatePath("/itinerary", "layout");
}
