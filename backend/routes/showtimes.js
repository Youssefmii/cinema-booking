const express = require('express');
const pool = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const parseSt = s => ({
  ...s,
  price_standard: parseFloat(s.price_standard),
  price_vip: parseFloat(s.price_vip),
  price_couple: parseFloat(s.price_couple),
});

router.get('/', async (req, res) => {
  try {
    const { movie_id } = req.query;
    let query = `
      SELECT s.*, m.title as movie_title, m.genre, m.duration, m.poster_url, h.name as hall_name
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      WHERE m.is_active = TRUE AND s.datetime > NOW()
    `;
    const params = [];
    if (movie_id) {
      params.push(movie_id);
      query += ` AND s.movie_id = $${params.length}`;
    }
    query += ' ORDER BY s.datetime ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows.map(parseSt));
  } catch (err) {
    console.error('Get showtimes error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, m.title as movie_title, h.name as hall_name
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      ORDER BY s.datetime ASC
    `);
    res.json(rows.map(parseSt));
  } catch (err) {
    console.error('Get all showtimes error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, m.title as movie_title, m.genre, m.duration, m.description, m.poster_url,
             h.name as hall_name, h.rows, h.seats_per_row
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      WHERE s.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Showtime not found' });
    res.json(parseSt(rows[0]));
  } catch (err) {
    console.error('Get showtime error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { movie_id, hall_id, datetime, price_standard, price_vip, price_couple } = req.body;
    if (!movie_id || !hall_id || !datetime) return res.status(400).json({ message: 'movie_id, hall_id, datetime required' });

    // Reject past dates
    if (new Date(datetime) < new Date()) return res.status(400).json({ message: 'Cannot create a showtime in the past' });

    // Check for overlap in same hall within 3 hours
    const { rows: overlapRows } = await pool.query(`
      SELECT id FROM showtimes
      WHERE hall_id = $1 AND ABS(EXTRACT(EPOCH FROM datetime) - EXTRACT(EPOCH FROM $2::timestamptz)) < 10800
    `, [hall_id, datetime]);
    if (overlapRows.length > 0) return res.status(409).json({ message: 'Showtime overlaps with existing one in this hall' });

    const { rows } = await pool.query(
      'INSERT INTO showtimes (movie_id, hall_id, datetime, price_standard, price_vip, price_couple) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [movie_id, hall_id, datetime, price_standard ?? 10, price_vip ?? 20, price_couple ?? 30]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error('Create showtime error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { movie_id, hall_id, datetime, price_standard, price_vip, price_couple } = req.body;
    const { rows } = await pool.query('SELECT * FROM showtimes WHERE id = $1', [req.params.id]);
    const st = rows[0];
    if (!st) return res.status(404).json({ message: 'Showtime not found' });
    await pool.query(
      'UPDATE showtimes SET movie_id=$1, hall_id=$2, datetime=$3, price_standard=$4, price_vip=$5, price_couple=$6 WHERE id=$7',
      [movie_id ?? st.movie_id, hall_id ?? st.hall_id, datetime ?? st.datetime, price_standard ?? st.price_standard, price_vip ?? st.price_vip, price_couple ?? st.price_couple, req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error('Update showtime error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    // Delete related bookings first (booking_seats/booking_snacks cascade from bookings)
    const { rows: bookings } = await pool.query('SELECT id FROM bookings WHERE showtime_id = $1', [req.params.id]);
    for (const b of bookings) {
      await pool.query('DELETE FROM bookings WHERE id = $1', [b.id]);
    }
    await pool.query('DELETE FROM showtimes WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete showtime error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
