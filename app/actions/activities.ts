"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";

function revalidate() {
  revalidatePath("/activities", "layout");
}

export async function addActivity(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  const db = getDb();
  db.prepare(
    `INSERT INTO wishlist_items
       (title, location, url, city, activity_date,
        interested_family1, interested_family2, interested_family3)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    name,
    (formData.get("location") as string) || null,
    (formData.get("url") as string) || null,
    (formData.get("city") as string) || null,
    (formData.get("activity_date") as string) || null,
    formData.get("interested_family1") === "on" ? 1 : 0,
    formData.get("interested_family2") === "on" ? 1 : 0,
    formData.get("interested_family3") === "on" ? 1 : 0
  );
  revalidate();
}

export async function updateActivity(id: number, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  const db = getDb();
  db.prepare(
    `UPDATE wishlist_items
     SET title=?, location=?, url=?, city=?, activity_date=?
     WHERE id=?`
  ).run(
    name,
    (formData.get("location") as string) || null,
    (formData.get("url") as string) || null,
    (formData.get("city") as string) || null,
    (formData.get("activity_date") as string) || null,
    id
  );
  revalidate();
}

export async function toggleInterest(id: number, familyKey: "family1" | "family2" | "family3", current: number) {
  const col = `interested_${familyKey}`;
  const db = getDb();
  db.prepare(`UPDATE wishlist_items SET ${col} = ? WHERE id = ?`).run(current ? 0 : 1, id);
  revalidate();
}

export async function deleteActivity(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM wishlist_items WHERE id = ?").run(id);
  revalidate();
}
