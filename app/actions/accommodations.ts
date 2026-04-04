"use server";

import { revalidatePath } from "next/cache";
import { dbRun } from "@/lib/db";
import { CITY_COORDS, LITHUANIAN_CITIES } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/accommodations", "layout");
  revalidatePath("/itinerary", "layout");
}

function parseCoords(formData: FormData, city: string): { lat: number | null; lng: number | null } {
  const latStr = formData.get("lat") as string;
  const lngStr = formData.get("lng") as string;
  if (latStr && lngStr) return { lat: parseFloat(latStr), lng: parseFloat(lngStr) };
  const coords = CITY_COORDS[city];
  if (coords) return { lat: coords[0], lng: coords[1] };
  return { lat: null, lng: null };
}

export async function saveHotelFromSearch(
  familyGroup: string,
  name: string,
  address: string,
  city: string,
  lat: number | null,
  lng: number | null,
  existingId?: number
) {
  if (existingId) {
    await dbRun(
      "UPDATE accommodations SET name=?, address=?, city=?, lat=?, lng=? WHERE id=?",
      [name, address, city, lat, lng, existingId]
    );
  } else {
    await dbRun(
      `INSERT INTO accommodations (city, name, check_in, check_out, address, family_group, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [city, name, "2026-07-31", "2026-08-07", address, familyGroup, lat, lng]
    );
  }
  revalidateAll();
}

export async function addAccommodation(formData: FormData) {
  const city = formData.get("city") as string;
  const name = formData.get("name") as string;
  const check_in = formData.get("check_in") as string;
  const check_out = formData.get("check_out") as string;
  if (!city || !name || !check_in || !check_out) return;

  const { lat, lng } = parseCoords(formData, city);
  await dbRun(
    `INSERT INTO accommodations (city, name, check_in, check_out, address, booking_ref, booking_url, notes, added_by, family_group, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      city, name, check_in, check_out,
      (formData.get("address") as string) || null,
      (formData.get("booking_ref") as string) || null,
      (formData.get("booking_url") as string) || null,
      (formData.get("notes") as string) || null,
      (formData.get("added_by") as string) || null,
      (formData.get("family_group") as string) || null,
      lat, lng,
    ]
  );
  revalidateAll();
}

export async function updateAccommodation(id: number, formData: FormData) {
  const city = formData.get("city") as string;
  const name = formData.get("name") as string;
  const check_in = formData.get("check_in") as string;
  const check_out = formData.get("check_out") as string;
  if (!city || !name || !check_in || !check_out) return;

  const { lat, lng } = parseCoords(formData, city);
  await dbRun(
    `UPDATE accommodations SET city=?, name=?, check_in=?, check_out=?, address=?, booking_ref=?, booking_url=?, notes=?, added_by=?, family_group=?, lat=?, lng=? WHERE id=?`,
    [
      city, name, check_in, check_out,
      (formData.get("address") as string) || null,
      (formData.get("booking_ref") as string) || null,
      (formData.get("booking_url") as string) || null,
      (formData.get("notes") as string) || null,
      (formData.get("added_by") as string) || null,
      (formData.get("family_group") as string) || null,
      lat, lng, id,
    ]
  );
  revalidateAll();
}

export async function deleteAccommodation(id: number) {
  await dbRun("DELETE FROM accommodations WHERE id = ?", [id]);
  revalidateAll();
}

void LITHUANIAN_CITIES;
