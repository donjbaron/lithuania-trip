import { createClient, type InValue } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Run once per module instance (cold start). All DB helpers await this.
const ready = initSchema();

async function initSchema() {
  // Create tables
  const creates = [
    `CREATE TABLE IF NOT EXISTS itinerary_days (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_date  TEXT NOT NULL UNIQUE,
      label      TEXT,
      city       TEXT,
      summary    TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS itinerary_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      day_id       INTEGER NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
      time_slot    TEXT,
      title        TEXT NOT NULL,
      notes        TEXT,
      added_by     TEXT,
      family_group TEXT,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS accommodations (
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
    )`,
    `CREATE TABLE IF NOT EXISTS wishlist_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'sight',
      city        TEXT,
      location    TEXT,
      description TEXT,
      url         TEXT,
      activity_date TEXT,
      time_slot   TEXT,
      address     TEXT,
      interested_family1 INTEGER NOT NULL DEFAULT 0,
      interested_family2 INTEGER NOT NULL DEFAULT 0,
      interested_family3 INTEGER NOT NULL DEFAULT 0,
      image_url   TEXT,
      wiki_url    TEXT,
      lat         REAL,
      lng         REAL,
      is_done     INTEGER NOT NULL DEFAULT 0,
      added_by    TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS restaurants (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      city        TEXT,
      meal_type   TEXT,
      activity_date TEXT,
      url         TEXT,
      address     TEXT,
      notes       TEXT,
      image_url   TEXT,
      interested_family1 INTEGER NOT NULL DEFAULT 0,
      interested_family2 INTEGER NOT NULL DEFAULT 0,
      interested_family3 INTEGER NOT NULL DEFAULT 0,
      lat         REAL,
      lng         REAL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_items_day_id ON itinerary_items(day_id)`,
    `CREATE INDEX IF NOT EXISTS idx_wishlist_category ON wishlist_items(category)`,
    `CREATE INDEX IF NOT EXISTS idx_accommodations_checkin ON accommodations(check_in)`,
  ];

  for (const sql of creates) {
    await client.execute(sql);
  }

  // Additive migrations — safe to re-run, errors mean column already exists
  const migrations = [
    "ALTER TABLE itinerary_items ADD COLUMN family_group TEXT",
    "ALTER TABLE accommodations ADD COLUMN family_group TEXT",
    "ALTER TABLE accommodations ADD COLUMN lat REAL",
    "ALTER TABLE accommodations ADD COLUMN lng REAL",
    "ALTER TABLE itinerary_days ADD COLUMN city TEXT",
    "ALTER TABLE itinerary_days ADD COLUMN summary TEXT",
    "ALTER TABLE wishlist_items ADD COLUMN location TEXT",
    "ALTER TABLE wishlist_items ADD COLUMN activity_date TEXT",
    "ALTER TABLE wishlist_items ADD COLUMN interested_family1 INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE wishlist_items ADD COLUMN interested_family2 INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE wishlist_items ADD COLUMN interested_family3 INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE wishlist_items ADD COLUMN image_url TEXT",
    "ALTER TABLE wishlist_items ADD COLUMN wiki_url TEXT",
    "ALTER TABLE wishlist_items ADD COLUMN time_slot TEXT",
    "ALTER TABLE wishlist_items ADD COLUMN lat REAL",
    "ALTER TABLE wishlist_items ADD COLUMN lng REAL",
    "ALTER TABLE wishlist_items ADD COLUMN address TEXT",
    "ALTER TABLE restaurants ADD COLUMN lat REAL",
    "ALTER TABLE restaurants ADD COLUMN lng REAL",
    "ALTER TABLE restaurants ADD COLUMN cuisine TEXT",
    "ALTER TABLE wishlist_items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
  ];

  for (const sql of migrations) {
    try { await client.execute(sql); } catch { /* column already exists */ }
  }

  // Seed the 7 trip days if the table is empty
  const { rows } = await client.execute("SELECT COUNT(*) as c FROM itinerary_days");
  if ((rows[0].c as number) === 0) {
    const dates = ["2026-07-31","2026-08-01","2026-08-02","2026-08-03","2026-08-04","2026-08-05","2026-08-06"];
    for (let i = 0; i < dates.length; i++) {
      await client.execute({ sql: "INSERT OR IGNORE INTO itinerary_days (trip_date, sort_order) VALUES (?, ?)", args: [dates[i], i] });
    }
  }
}

export async function dbAll<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  await ready;
  const result = await client.execute({ sql, args });
  return result.rows.map((row) => ({ ...row })) as unknown as T[];
}

export async function dbGet<T>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  await ready;
  const result = await client.execute({ sql, args });
  const row = result.rows[0];
  return row ? ({ ...row } as unknown as T) : undefined;
}

export async function dbRun(sql: string, args: InValue[] = []): Promise<void> {
  await ready;
  await client.execute({ sql, args });
}
