"use server";

import { revalidatePath } from "next/cache";
import { dbRun } from "@/lib/db";

export async function addWishlistItem(formData: FormData) {
  const title = formData.get("title") as string;
  if (!title) return;

  await dbRun(
    `INSERT INTO wishlist_items (title, category, city, description, url, added_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      title,
      (formData.get("category") as string) || "sight",
      (formData.get("city") as string) || null,
      (formData.get("description") as string) || null,
      (formData.get("url") as string) || null,
      (formData.get("added_by") as string) || null,
    ]
  );
  revalidatePath("/wishlist");
}

export async function toggleWishlistDone(id: number, currentDone: number) {
  await dbRun("UPDATE wishlist_items SET is_done = ? WHERE id = ?", [currentDone ? 0 : 1, id]);
  revalidatePath("/wishlist");
}

export async function updateWishlistItem(id: number, formData: FormData) {
  const title = formData.get("title") as string;
  if (!title) return;

  await dbRun(
    `UPDATE wishlist_items SET title=?, category=?, city=?, description=?, url=?, added_by=? WHERE id=?`,
    [
      title,
      (formData.get("category") as string) || "sight",
      (formData.get("city") as string) || null,
      (formData.get("description") as string) || null,
      (formData.get("url") as string) || null,
      (formData.get("added_by") as string) || null,
      id,
    ]
  );
  revalidatePath("/wishlist");
}

export async function deleteWishlistItem(id: number) {
  await dbRun("DELETE FROM wishlist_items WHERE id = ?", [id]);
  revalidatePath("/wishlist");
}
