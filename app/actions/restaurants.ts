"use server";

import { revalidatePath } from "next/cache";
import { dbGet, dbRun } from "@/lib/db";

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (!match) return null;
    const imgUrl = match[1];
    if (imgUrl.startsWith("http")) return imgUrl;
    return new URL(imgUrl, new URL(url).origin).toString();
  } catch {
    return null;
  }
}

function revalidate() {
  revalidatePath("/restaurants", "layout");
}

export async function addRestaurant(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  const url = (formData.get("url") as string) || null;
  const imageUrl = url ? await fetchOgImage(url) : null;

  const latStr = formData.get("lat") as string;
  const lngStr = formData.get("lng") as string;
  await dbRun(
    `INSERT INTO restaurants (name, city, meal_type, activity_date, url, address, notes, image_url, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      (formData.get("city") as string) || null,
      (formData.get("meal_type") as string) || null,
      (formData.get("activity_date") as string) || null,
      url,
      (formData.get("address") as string) || null,
      (formData.get("notes") as string) || null,
      imageUrl,
      latStr ? parseFloat(latStr) : null,
      lngStr ? parseFloat(lngStr) : null,
    ]
  );
  revalidate();
}

export async function updateRestaurant(id: number, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  const url = (formData.get("url") as string) || null;

  const existing = await dbGet<{ url: string | null; image_url: string | null }>(
    "SELECT url, image_url FROM restaurants WHERE id = ?",
    [id]
  );
  let imageUrl = existing?.image_url ?? null;
  if (url && url !== existing?.url) imageUrl = await fetchOgImage(url);
  else if (!url) imageUrl = null;

  const latStr = formData.get("lat") as string;
  const lngStr = formData.get("lng") as string;
  await dbRun(
    `UPDATE restaurants SET name=?, city=?, meal_type=?, activity_date=?, url=?, address=?, notes=?, image_url=?, lat=?, lng=? WHERE id=?`,
    [
      name,
      (formData.get("city") as string) || null,
      (formData.get("meal_type") as string) || null,
      (formData.get("activity_date") as string) || null,
      url,
      (formData.get("address") as string) || null,
      (formData.get("notes") as string) || null,
      imageUrl,
      latStr ? parseFloat(latStr) : null,
      lngStr ? parseFloat(lngStr) : null,
      id,
    ]
  );
  revalidate();
}

export async function toggleRestaurantInterest(
  id: number,
  familyKey: "family1" | "family2" | "family3",
  current: number
) {
  await dbRun(
    `UPDATE restaurants SET interested_${familyKey} = ? WHERE id = ?`,
    [current ? 0 : 1, id]
  );
  revalidate();
}

export async function deleteRestaurant(id: number) {
  await dbRun("DELETE FROM restaurants WHERE id = ?", [id]);
  revalidate();
}
