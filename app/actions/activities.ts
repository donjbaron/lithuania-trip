"use server";

import { revalidatePath } from "next/cache";
import { dbAll, dbGet, dbRun } from "@/lib/db";

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

async function fetchWikiData(title: string, city: string | null): Promise<{ url: string | null; imageUrl: string | null }> {
  try {
    const query = encodeURIComponent(`${title}${city ? " " + city : ""} Lithuania`);
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&srlimit=1&format=json&origin=*`,
      { signal: AbortSignal.timeout(4000) }
    );
    const searchData = await searchRes.json();
    const hit = searchData?.query?.search?.[0];
    if (!hit) return { url: null, imageUrl: null };

    const wikiTitle = hit.title.replace(/ /g, "_");
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`;

    const thumbRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=pageimages&pithumbsize=400&format=json&origin=*`,
      { signal: AbortSignal.timeout(4000) }
    );
    const thumbData = await thumbRes.json();
    const pages = thumbData?.query?.pages ?? {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = Object.values(pages)[0] as any;
    const imageUrl: string | null = page?.thumbnail?.source ?? null;

    return { url, imageUrl };
  } catch {
    return { url: null, imageUrl: null };
  }
}

export async function addActivity(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  const url = (formData.get("url") as string) || null;
  const city = (formData.get("city") as string) || null;
  const [ogImage, wikiData] = await Promise.all([
    url ? fetchOgImage(url) : Promise.resolve(null),
    fetchWikiData(name, city),
  ]);
  const imageUrl = ogImage ?? wikiData.imageUrl;
  const wikiUrl = wikiData.url;
  const latStr = formData.get("lat") as string;
  const lngStr = formData.get("lng") as string;
  await dbRun(
    `INSERT INTO wishlist_items
       (title, location, url, city, activity_date, time_slot,
        interested_family1, interested_family2, interested_family3, image_url, wiki_url, address, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      wikiUrl,
      (formData.get("address") as string) || null,
      latStr ? parseFloat(latStr) : null,
      lngStr ? parseFloat(lngStr) : null,
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
  let wikiUrl = existing?.wiki_url ?? null;

  const needsNewImage = (url && url !== existing?.url) || (!url && imageUrl);
  const needsWiki = name !== existing?.title && !wikiUrl;

  if (needsNewImage || needsWiki) {
    const [ogImage, wikiData] = await Promise.all([
      needsNewImage && url ? fetchOgImage(url) : Promise.resolve(null),
      needsWiki ? fetchWikiData(name, city) : Promise.resolve({ url: null, imageUrl: null }),
    ]);
    if (needsNewImage) imageUrl = url ? (ogImage ?? wikiData.imageUrl ?? existing?.image_url ?? null) : null;
    if (needsWiki) wikiUrl = wikiData.url;
  }

  // If still no image but has wiki url, try fetching wiki thumbnail now
  if (!imageUrl && wikiUrl) {
    try {
      const wikiTitle = wikiUrl.split("/wiki/")[1];
      const thumbRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${wikiTitle}&prop=pageimages&pithumbsize=400&format=json&origin=*`,
        { signal: AbortSignal.timeout(4000) }
      );
      const thumbData = await thumbRes.json();
      const pages = thumbData?.query?.pages ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page = Object.values(pages)[0] as any;
      imageUrl = page?.thumbnail?.source ?? null;
    } catch { /* ignore */ }
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

export async function unassignActivityDate(id: number) {
  await dbRun("UPDATE wishlist_items SET activity_date = NULL WHERE id = ?", [id]);
  revalidate();
}

export async function reorderActivities(orderedIds: number[]) {
  for (let i = 0; i < orderedIds.length; i++) {
    await dbRun("UPDATE wishlist_items SET sort_order = ? WHERE id = ?", [i, orderedIds[i]]);
  }
  revalidate();
}

export async function backfillActivityAddresses() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return { updated: 0 };

  const items = await dbAll<{ id: number; title: string; city: string | null }>(
    "SELECT id, title, city FROM wishlist_items WHERE (address IS NULL OR address = '') OR (lat IS NULL OR lng IS NULL)"
  );

  let updated = 0;
  for (const item of items) {
    try {
      const query = encodeURIComponent(`${item.title}${item.city ? " " + item.city : ""} Lithuania`);
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`,
        { signal: AbortSignal.timeout(5000) }
      );
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const place = data?.results?.[0] as any;
      if (!place) continue;

      await dbRun(
        "UPDATE wishlist_items SET address=?, lat=?, lng=? WHERE id=?",
        [
          place.formatted_address ?? null,
          place.geometry?.location?.lat ?? null,
          place.geometry?.location?.lng ?? null,
          item.id,
        ]
      );
      updated++;
    } catch { /* ignore per-item errors */ }
  }

  revalidate();
  return { updated };
}
