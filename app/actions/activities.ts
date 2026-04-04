"use server";

import { revalidatePath } from "next/cache";
import { dbGet, dbRun } from "@/lib/db";

function revalidate() {
  revalidatePath("/activities", "layout");
  revalidatePath("/itinerary", "layout");
}

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
    const base = new URL(url);
    return new URL(imgUrl, base.origin).toString();
  } catch {
    return null;
  }
}

async function fetchWikiUrl(title: string, city: string | null): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${title}${city ? " " + city : ""} Lithuania`);
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&srlimit=1&format=json&origin=*`,
      { signal: AbortSignal.timeout(4000) }
    );
    const data = await res.json();
    const hit = data?.query?.search?.[0];
    if (!hit) return null;
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, "_"))}`;
  } catch {
    return null;
  }
}

export async function addActivity(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  const url = (formData.get("url") as string) || null;
  const city = (formData.get("city") as string) || null;
  const [imageUrl, wikiUrl] = await Promise.all([
    url ? fetchOgImage(url) : Promise.resolve(null),
    fetchWikiUrl(name, city),
  ]);
  await dbRun(
    `INSERT INTO wishlist_items
       (title, location, url, city, activity_date, time_slot,
        interested_family1, interested_family2, interested_family3, image_url, address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      (formData.get("location") as string) || null,
      url,
      city,
      (formData.get("activity_date") as string) || null,
      (formData.get("time_slot") as string) || null,
      formData.get("interested_family1") === "on" ? 1 : 0,
      formData.get("interested_family2") === "on" ? 1 : 0,
      formData.get("interested_family3") === "on" ? 1 : 0,
      imageUrl,
      (formData.get("address") as string) || null,
    ]
  );
  revalidate();
}

export async function updateActivity(id: number, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  const url = (formData.get("url") as string) || null;
  const city = (formData.get("city") as string) || null;

  const existing = await dbGet<{ url: string | null; image_url: string | null; title: string; wiki_url: string | null }>(
    "SELECT url, image_url, title, wiki_url FROM wishlist_items WHERE id = ?",
    [id]
  );

  let imageUrl = existing?.image_url ?? null;
  if (url && url !== existing?.url) {
    imageUrl = await fetchOgImage(url);
  } else if (!url) {
    imageUrl = null;
  }

  let wikiUrl = existing?.wiki_url ?? null;
  if (name !== existing?.title && !wikiUrl) {
    wikiUrl = await fetchWikiUrl(name, city);
  }

  await dbRun(
    `UPDATE wishlist_items
     SET title=?, location=?, url=?, city=?, activity_date=?, time_slot=?, image_url=?, wiki_url=?, address=?
     WHERE id=?`,
    [
      name,
      (formData.get("location") as string) || null,
      url,
      city,
      (formData.get("activity_date") as string) || null,
      (formData.get("time_slot") as string) || null,
      imageUrl,
      wikiUrl,
      (formData.get("address") as string) || null,
      id,
    ]
  );
  revalidate();
}

export async function toggleInterest(id: number, familyKey: "family1" | "family2" | "family3", current: number) {
  const col = `interested_${familyKey}`;
  await dbRun(`UPDATE wishlist_items SET ${col} = ? WHERE id = ?`, [current ? 0 : 1, id]);
  revalidate();
}

export async function setAllInterest(id: number, value: 0 | 1) {
  await dbRun(
    `UPDATE wishlist_items SET interested_family1=?, interested_family2=?, interested_family3=? WHERE id=?`,
    [value, value, value, id]
  );
  revalidate();
}

export async function deleteActivity(id: number) {
  await dbRun("DELETE FROM wishlist_items WHERE id = ?", [id]);
  revalidate();
}

export async function moveActivitiesToDay(ids: number[], newDate: string) {
  for (const id of ids) {
    await dbRun("UPDATE wishlist_items SET activity_date = ? WHERE id = ?", [newDate, id]);
  }
  revalidate();
}
