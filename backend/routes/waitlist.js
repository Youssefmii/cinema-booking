const express = require('express');
const pool = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Admin: get all waitlist entries (must be before /:id routes)
router.get('/admin/all', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { rows } = await pool.query(`
      SELECT w.*, u.name as user_name, u.email as user_email,
             s.datetime, m.title as movie_title, h.name as hall_name
      FROM waitlist w
      JOIN users u ON w.user_id = u.id
      JOIN showtimes s ON w.showtime_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      ORDER BY w.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Admin waitlist error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: remove a waitlist entry (must be before DELETE /:id)
router.delete('/admin/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    await pool.query('DELETE FROM waitlist WHERE id = $1', [req.params.id]);
    res.json({ message: 'Removed from waitlist' });
  } catch (err) {
    console.error('Admin remove waitlist error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join waitlist for a showtime
router.post('/', authenticate, async (req, res) => {
  try {
    const { showtime_id } = req.body;
    if (!showtime_id) return res.status(400).json({ message: 'showtime_id required' });

    const { rows: stRows } = await pool.query('SELECT * FROM showtimes WHERE id = $1', [showtime_id]);
    if (!stRows[0]) return res.status(404).json({ message: 'Showtime not found' });
    const showtime = stRows[0];

    // Check if already on waitlist
    const { rows: existing } = await pool.query(
      'SELECT * FROM waitlist WHERE user_id = $1 AND showtime_id = $2',
      [req.user.id, showtime_id]
    );
    if (existing.length > 0) return res.status(409).json({ message: 'Already on waitlist' });

    // Check if showtime is actually full
    const { rows: totalRows } = await pool.query(
      'SELECT COUNT(*) as count FROM seats WHERE hall_id = $1',
      [showtime.hall_id]
    );
    const totalSeats = parseInt(totalRows[0].count);

    const { rows: bookedRows } = await pool.query(`
      SELECT COUNT(*) as count FROM booking_seats bs
      JOIN bookings b ON bs.booking_id = b.id
      WHERE b.showtime_id = $1 AND b.status != 'cancelled'
    `, [showtime_id]);
    const bookedSeats = parseInt(bookedRows[0].count);

    if (bookedSeats < totalSeats) return res.status(400).json({ message: 'Seats are still available — no need to join waitlist' });

    await pool.query('INSERT INTO waitlist (user_id, showtime_id) VALUES ($1, $2)', [req.user.id, showtime_id]);
    res.status(201).json({ message: 'Added to waitlist' });
  } catch (err) {
    console.error('Join waitlist error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my waitlist
router.get('/my', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT w.*, s.datetime, m.title as movie_title, m.poster_url, h.name as hall_name
      FROM waitlist w
      JOIN showtimes s ON w.showtime_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      WHERE w.user_id = $1 AND w.status = 'waiting'
      ORDER BY w.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error('Get my waitlist error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if user is on waitlist for a showtime
router.get('/check/:showtimeId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM waitlist WHERE user_id = $1 AND showtime_id = $2',
      [req.user.id, req.params.showtimeId]
    );
    const entry = rows[0] || null;
    res.json({ onWaitlist: !!entry, entry });
  } catch (err) {
    console.error('Check waitlist error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave waitlist
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM waitlist WHERE id = $1', [req.params.id]);
    const entry = rows[0];
    if (!entry) return res.status(404).json({ message: 'Not found' });
    if (entry.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    await pool.query('DELETE FROM waitlist WHERE id = $1', [req.params.id]);
    res.json({ message: 'Removed from waitlist' });
  } catch (err) {
    console.error('Leave waitlist error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
