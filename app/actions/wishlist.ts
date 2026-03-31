"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";

export async function addWishlistItem(formData: FormData) {
  const title = formData.get("title") as string;
  if (!title) return;

  const db = getDb();
  db.prepare(
    `INSERT INTO wishlist_items (title, category, city, description, url, added_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    title,
    (formData.get("category") as string) || "sight",
    (formData.get("city") as string) || null,
    (formData.get("description") as string) || null,
    (formData.get("url") as string) || null,
    (formData.get("added_by") as string) || null
  );

  revalidatePath("/wishlist");
}

export async function toggleWishlistDone(id: number, currentDone: number) {
  const db = getDb();
  db.prepare("UPDATE wishlist_items SET is_done = ? WHERE id = ?").run(
    currentDone ? 0 : 1,
    id
  );
  revalidatePath("/wishlist");
}

export async function updateWishlistItem(id: number, formData: FormData) {
  const title = formData.get("title") as string;
  if (!title) return;

  const db = getDb();
  db.prepare(
    `UPDATE wishlist_items SET title=?, category=?, city=?, description=?, url=?, added_by=? WHERE id=?`
  ).run(
    title,
    (formData.get("category") as string) || "sight",
    (formData.get("city") as string) || null,
    (formData.get("description") as string) || null,
    (formData.get("url") as string) || null,
    (formData.get("added_by") as string) || null,
    id
  );

  revalidatePath("/wishlist");
}

export async function deleteWishlistItem(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM wishlist_items WHERE id = ?").run(id);
  revalidatePath("/wishlist");
}
