import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "trip.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS itinerary_days (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_date  TEXT NOT NULL UNIQUE,
      label      TEXT,
      city       TEXT,
      summary    TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS itinerary_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      day_id       INTEGER NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
      time_slot    TEXT,
      title        TEXT NOT NULL,
      notes        TEXT,
      added_by     TEXT,
      family_group TEXT,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accommodations (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      city         TEXT NOT NULL,
      name         TEXT NOT NULL,
      check_in     TEXT NOT NULL,
      check_out    TEXT NOT NULL,
      address      TEXT,
      booking_ref  TEXT,
      booking_url  TEXT,
      notes        TEXT,
      added_by     TEXT,
      family_group TEXT,
      lat          REAL,
      lng          REAL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wishlist_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'sight',
      city        TEXT,
      description TEXT,
      url         TEXT,
      is_done     INTEGER NOT NULL DEFAULT 0,
      added_by    TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_items_day_id ON itinerary_items(day_id);
    CREATE INDEX IF NOT EXISTS idx_wishlist_category ON wishlist_items(category);
    CREATE INDEX IF NOT EXISTS idx_accommodations_checkin ON accommodations(check_in);
  `);

  // Migrations: add new columns to existing tables if they don't exist yet
  const migrations = [
    "ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS family_group TEXT",
    "ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS family_group TEXT",
    "ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS lat REAL",
    "ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS lng REAL",
    "ALTER TABLE itinerary_days ADD COLUMN IF NOT EXISTS city TEXT",
    "ALTER TABLE itinerary_days ADD COLUMN IF NOT EXISTS summary TEXT",
    "ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS location TEXT",
    "ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS activity_date TEXT",
    "ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS interested_family1 INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS interested_family2 INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS interested_family3 INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS image_url TEXT",
    "ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS wiki_url TEXT",
    "ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS time_slot TEXT",
    "ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS lat REAL",
    "ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS lng REAL",
  ];
  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch {
      // Column already exists
    }
  }

  // Seed the 7 trip days (Jul 31 – Aug 6, 2025) if not already present
  const count = (
    db.prepare("SELECT COUNT(*) as c FROM itinerary_days").get() as {
      c: number;
    }
  ).c;

  if (count === 0) {
    const insertDay = db.prepare(
      "INSERT OR IGNORE INTO itinerary_days (trip_date, sort_order) VALUES (?, ?)"
    );
    const dates = [
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
    ];
    dates.forEach((date, i) => insertDay.run(date, i));
  }
}
