require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { startReminderJob } = require('./utils/reminders');

const pool = require('./database');
const app = express();

app.use(cors());
app.use(express.json());

// Ensure waitlist table has required columns
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        showtime_id INTEGER NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'waiting',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Add status column if missing (for existing tables)
    await pool.query(`
      ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'waiting'
    `);
    // Fix any existing rows with NULL status
    await pool.query(`UPDATE waitlist SET status = 'waiting' WHERE status IS NULL`);
  } catch (err) {
    console.error('Waitlist table migration:', err.message);
  }
})();

app.use('/api/auth', require('./routes/auth'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/movies/:movieId/reviews', require('./routes/reviews'));
app.use('/api/halls', require('./routes/halls'));
app.use('/api/showtimes', require('./routes/showtimes'));
app.use('/api/seats', require('./routes/seats'));
app.use('/api/snacks', require('./routes/snacks'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/users', require('./routes/users'));
app.use('/api/waitlist', require('./routes/waitlist'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve React frontend build in production
const frontendBuild = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendBuild)) {
  // Hashed assets (JS/CSS) — cache forever
  app.use('/assets', express.static(path.join(frontendBuild, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }));
  // Everything else (index.html, vite.svg, etc.) — never cache
  app.use(express.static(frontendBuild, { maxAge: 0 }));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ message: 'Not found' });
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startReminderJob();
  });
} else {
  startReminderJob();
}

module.exports = app;
