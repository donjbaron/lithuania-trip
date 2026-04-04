"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { CITY_COORDS, LITHUANIAN_CITIES } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/accommodations", "layout");
  revalidatePath("/itinerary", "layout");
}

// Save a hotel chosen from search autocomplete — no form needed
export async function saveHotelFromSearch(
  familyGroup: string,
  name: string,
  address: string,
  city: string,
  lat: number | null,
  lng: number | null,
  existingId?: number
) {
  const db = getDb();

  if (existingId) {
    db.prepare(
      "UPDATE accommodations SET name=?, address=?, city=?, lat=?, lng=? WHERE id=?"
    ).run(name, address, city, lat, lng, existingId);
  } else {
    db.prepare(
      `INSERT INTO accommodations
         (city, name, check_in, check_out, address, family_group, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(city, name, "2026-07-31", "2026-08-07", address, familyGroup, lat, lng);
  }

  revalidateAll();
}

// ── Full-form actions (used by the Hotels page) ──────────────────────────────

function parseCoords(formData: FormData, city: string): { lat: number | null; lng: number | null } {
  const latStr = formData.get("lat") as string;
  const lngStr = formData.get("lng") as string;
  if (latStr && lngStr) return { lat: parseFloat(latStr), lng: parseFloat(lngStr) };
  const coords = CITY_COORDS[city];
  if (coords) return { lat: coords[0], lng: coords[1] };
  return { lat: null, lng: null };
}

export async function addAccommodation(formData: FormData) {
  const city = formData.get("city") as string;
  const name = formData.get("name") as string;
  const check_in = formData.get("check_in") as string;
  const check_out = formData.get("check_out") as string;
  if (!city || !name || !check_in || !check_out) return;

  const { lat, lng } = parseCoords(formData, city);
  const db = getDb();
  db.prepare(
    `INSERT INTO accommodations (city, name, check_in, check_out, address, booking_ref, booking_url, notes, added_by, family_group, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    city, name, check_in, check_out,
    (formData.get("address") as string) || null,
    (formData.get("booking_ref") as string) || null,
    (formData.get("booking_url") as string) || null,
    (formData.get("notes") as string) || null,
    (formData.get("added_by") as string) || null,
    (formData.get("family_group") as string) || null,
    lat, lng
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
  const db = getDb();
  db.prepare(
    `UPDATE accommodations SET city=?, name=?, check_in=?, check_out=?, address=?, booking_ref=?, booking_url=?, notes=?, added_by=?, family_group=?, lat=?, lng=? WHERE id=?`
  ).run(
    city, name, check_in, check_out,
    (formData.get("address") as string) || null,
    (formData.get("booking_ref") as string) || null,
    (formData.get("booking_url") as string) || null,
    (formData.get("notes") as string) || null,
    (formData.get("added_by") as string) || null,
    (formData.get("family_group") as string) || null,
    lat, lng, id
  );
  revalidateAll();
}

export async function deleteAccommodation(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM accommodations WHERE id = ?").run(id);
  revalidateAll();
}

// Keep unused import happy
void LITHUANIAN_CITIES;
