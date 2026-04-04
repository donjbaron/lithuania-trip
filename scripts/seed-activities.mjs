// Run: node scripts/seed-activities.mjs
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "trip.db");
const db = new Database(DB_PATH);

const insert = db.prepare(`
  INSERT INTO wishlist_items (title, city, activity_date, category)
  VALUES (?, ?, ?, 'activity')
`);

const activities = [
  // Day 1 — Friday Jul 31
  { title: "Arrive & check in", city: "Vilnius", date: "2026-07-31" },
  { title: "Gedimino street walk", city: "Vilnius", date: "2026-07-31" },
  { title: "Cathedral", city: "Vilnius", date: "2026-07-31" },
  { title: "Gediminas Castle Tower", city: "Vilnius", date: "2026-07-31" },

  // Day 2 — Saturday Aug 1
  { title: "Belmontas or Vingis Park", city: "Vilnius", date: "2026-08-01" },
  { title: "Visit house in Naujininkai", city: "Vilnius", date: "2026-08-01" },
  { title: "Judy's school", city: "Vilnius", date: "2026-08-01" },
  { title: "Old City & Užupis", city: "Vilnius", date: "2026-08-01" },
  { title: "Jewish Quarter & Goan", city: "Vilnius", date: "2026-08-01" },

  // Day 3 — Sunday Aug 2 (Vilnius → Trakai → Kaunas)
  { title: "Trakai Castle stop", city: "Trakai", date: "2026-08-02" },
  { title: "Arrive Kaunas, check in & evening walk", city: "Kaunas", date: "2026-08-02" },

  // Day 4 — Monday Aug 3
  { title: "Čiurlionis Museum", city: "Kaunas", date: "2026-08-03" },
  { title: "Žmuidzinavičius Museum (Devils Museum)", city: "Kaunas", date: "2026-08-03" },
  { title: "Laisvės Alėja & Soboras", city: "Kaunas", date: "2026-08-03" },
  { title: "War Museum", city: "Kaunas", date: "2026-08-03" },
  { title: "Kaunas Old Town & Castle", city: "Kaunas", date: "2026-08-03" },
  { title: "Bubbie & Zeide's old neighborhood", city: "Kaunas", date: "2026-08-03" },
  { title: "Cemetery", city: "Kaunas", date: "2026-08-03" },
  { title: "Shores of Nemunas / Neris", city: "Kaunas", date: "2026-08-03" },
  { title: "Žalgiris Stadium", city: "Kaunas", date: "2026-08-03" },
  { title: "Panemunė — Stasė and family", city: "Kaunas", date: "2026-08-03" },
  { title: "Akropolis shopping mall (skating rink)", city: "Kaunas", date: "2026-08-03" },

  // Day 5 — Tuesday Aug 4 (Kaunas → Skaudvilė → Švekšnė → Plungė → Palanga)
  { title: "Šeduva Jewish Memorial Museum", city: "Other", date: "2026-08-04" },
  { title: "Palanga beaches, pier & sunset", city: "Palanga", date: "2026-08-04" },

  // Day 6 — Wednesday Aug 5
  { title: "Palanga Parks", city: "Palanga", date: "2026-08-05" },
  { title: "Palanga Beaches", city: "Palanga", date: "2026-08-05" },
];

const existing = db.prepare("SELECT title, activity_date FROM wishlist_items WHERE activity_date IS NOT NULL").all();
const existingKeys = new Set(existing.map(r => `${r.title}|${r.activity_date}`));

let added = 0;
let skipped = 0;
for (const a of activities) {
  const key = `${a.title}|${a.date}`;
  if (existingKeys.has(key)) {
    skipped++;
    continue;
  }
  insert.run(a.title, a.city, a.date);
  added++;
}

console.log(`Done: ${added} added, ${skipped} skipped (already exist)`);
db.close();
