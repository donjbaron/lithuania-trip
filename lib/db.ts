import { createClient, type InValue, type Client } from "@libsql/client";

// Lazily initialized — createClient is deferred until the first DB call so
// that TURSO_DATABASE_URL is not required at build time (Vercel build phase
// does not inject runtime env vars).
let _client: Client | null = null;
let _ready: Promise<void> | null = null;

function getClient(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    _ready = initSchema(_client);
  }
  return _client;
}

async function ensureReady(): Promise<Client> {
  const c = getClient();
  await _ready;
  return c;
}

async function initSchema(client: Client) {
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
    "ALTER TABLE wishlist_items ADD COLUMN duration_mins INTEGER NOT NULL DEFAULT 90",
    "ALTER TABLE itinerary_days ADD COLUMN breakfast_time TEXT",
  ];

  for (const sql of migrations) {
    try { await client.execute(sql); } catch { /* column already exists */ }
  }

  // Seed breakfast restaurants by city if none exist yet
  const { rows: bfRows } = await client.execute("SELECT COUNT(*) as c FROM restaurants WHERE meal_type = 'breakfast'");
  if ((bfRows[0].c as number) === 0) {
    const breakfasts = [
      { name: "Neringa", city: "Vilnius", address: "Gedimino pr. 23, Vilnius", lat: 54.6877, lng: 25.2800 },
      { name: "Hotel Kaunas", city: "Kaunas", address: "Laisvės al. 73, Kaunas", lat: 54.8985, lng: 23.9036 },
      { name: "Mana", city: "Palanga", address: "Birutės g. 17, Palanga", lat: 55.9183, lng: 21.0691 },
    ];
    for (const b of breakfasts) {
      await client.execute({
        sql: "INSERT INTO restaurants (name, city, meal_type, address, lat, lng) VALUES (?, ?, 'breakfast', ?, ?, ?)",
        args: [b.name, b.city, b.address, b.lat, b.lng],
      });
    }
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
  const client = await ensureReady();
  const result = await client.execute({ sql, args });
  return result.rows.map((row) => ({ ...row })) as unknown as T[];
}

export async function dbGet<T>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  const client = await ensureReady();
  const result = await client.execute({ sql, args });
  const row = result.rows[0];
  return row ? ({ ...row } as unknown as T) : undefined;
}

export async function dbRun(sql: string, args: InValue[] = []): Promise<void> {
  const client = await ensureReady();
  await client.execute({ sql, args });
}
