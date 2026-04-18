// SQLite database layer — local-only.
// Exposes a pg-compatible `pool.query()` / `pool.connect()` API so the route files
// can keep using `$1, $2` placeholders and `{rows}` result shapes unchanged.

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'cinema.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema on startup. Idempotent — uses CREATE TABLE IF NOT EXISTS.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    customer_number TEXT,
    is_blacklisted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    genre TEXT,
    duration INTEGER,
    description TEXT,
    poster_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS halls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    rows INTEGER DEFAULT 10,
    seats_per_row INTEGER DEFAULT 10,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hall_id INTEGER NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    row_label TEXT NOT NULL,
    seat_number INTEGER NOT NULL,
    seat_type TEXT DEFAULT 'standard',
    UNIQUE(hall_id, row_label, seat_number)
  );

  CREATE TABLE IF NOT EXISTS showtimes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    hall_id INTEGER NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    datetime TEXT NOT NULL,
    price_standard REAL DEFAULT 12,
    price_vip REAL DEFAULT 22,
    price_couple REAL DEFAULT 35,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS snacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    price REAL NOT NULL,
    category TEXT DEFAULT 'other',
    image_url TEXT,
    is_available INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    showtime_id INTEGER NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    reference_number TEXT UNIQUE NOT NULL,
    total_price REAL DEFAULT 0,
    status TEXT DEFAULT 'confirmed',
    reminder_sent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS booking_seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    seat_id INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS booking_snacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    snack_id INTEGER NOT NULL REFERENCES snacks(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    showtime_id INTEGER NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'waiting',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, movie_id)
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Translate PostgreSQL-style $1, $2, $N placeholders into SQLite ? placeholders,
// preserving positional order. Also normalizes JS boolean params → 0/1 and Date → ISO string.
function translate(sql, params = []) {
  const ordered = [];
  const newSql = sql.replace(/\$(\d+)/g, (_, n) => {
    ordered.push(params[parseInt(n, 10) - 1]);
    return '?';
  });
  const sqliteParams = ordered.map(p => {
    if (p === true) return 1;
    if (p === false) return 0;
    if (p === undefined) return null;
    if (p instanceof Date) return p.toISOString();
    return p;
  });
  return { sql: newSql, params: sqliteParams };
}

function execQuery(sql, params = []) {
  const { sql: s, params: p } = translate(sql, params);
  const trimmed = s.trim();
  const upper = trimmed.toUpperCase();

  // Transaction control commands
  if (upper === 'BEGIN' || upper === 'COMMIT' || upper === 'ROLLBACK') {
    db.exec(trimmed);
    return { rows: [], rowCount: 0 };
  }

  const isReturning = /\bRETURNING\b/i.test(s);
  const isRead = upper.startsWith('SELECT') || upper.startsWith('WITH') || isReturning || upper.startsWith('PRAGMA');

  const stmt = db.prepare(s);
  if (isRead) {
    const rows = stmt.all(...p);
    return { rows, rowCount: rows.length };
  }
  const result = stmt.run(...p);
  return { rows: [], rowCount: result.changes };
}

// pg-compatible pool object
const pool = {
  query: async (sql, params) => execQuery(sql, params),
  connect: async () => ({
    query: async (sql, params) => execQuery(sql, params),
    release: () => {},
  }),
  // expose underlying better-sqlite3 db for advanced use
  _db: db,
};

module.exports = pool;
