const express = require('express');
const pool = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all seats for a hall (admin)
router.get('/hall/:hallId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM seats WHERE hall_id = $1 ORDER BY row_label, seat_number',
      [req.params.hallId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get seats by hall error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get seats for a showtime with availability
router.get('/showtime/:showtimeId', async (req, res) => {
  try {
    const { showtimeId } = req.params;
    const { rows: stRows } = await pool.query('SELECT hall_id FROM showtimes WHERE id = $1', [showtimeId]);
    if (!stRows[0]) return res.status(404).json({ message: 'Showtime not found' });
    const hallId = stRows[0].hall_id;

    const { rows: seats } = await pool.query(
      'SELECT * FROM seats WHERE hall_id = $1 ORDER BY row_label, seat_number',
      [hallId]
    );

    const { rows: bookedRows } = await pool.query(`
      SELECT bs.seat_id FROM booking_seats bs
      JOIN bookings b ON bs.booking_id = b.id
      WHERE b.showtime_id = $1 AND b.status != 'cancelled'
    `, [showtimeId]);

    const bookedSeatIds = new Set(bookedRows.map(r => r.seat_id));
    res.json(seats.map(seat => ({ ...seat, is_booked: bookedSeatIds.has(seat.id) })));
  } catch (err) {
    console.error('Get seats by showtime error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a seat's type (admin)
// Couple seats must always come in pairs (last 2 seats of a row).
// Changing a seat to/from couple automatically updates its row partner too.
router.patch('/:seatId/type', authenticate, requireAdmin, async (req, res) => {
  try {
    const { seat_type } = req.body;
    if (!['standard', 'vip', 'couple'].includes(seat_type))
      return res.status(400).json({ message: 'Invalid seat type' });

    const { rows } = await pool.query('SELECT * FROM seats WHERE id = $1', [req.params.seatId]);
    if (!rows[0]) return res.status(404).json({ message: 'Seat not found' });
    const seat = rows[0];

    // Find all seats in the same row to determine couple partner
    const { rows: rowSeats } = await pool.query(
      'SELECT * FROM seats WHERE hall_id = $1 AND row_label = $2 ORDER BY seat_number',
      [seat.hall_id, seat.row_label]
    );

    // Last 2 seats in the row are the couple zone
    const last2 = rowSeats.slice(-2);
    const inCoupleZone = last2.some(s => s.id === seat.id);
    const partner = last2.find(s => s.id !== seat.id);

    if (seat_type === 'couple') {
      if (!inCoupleZone)
        return res.status(400).json({ message: 'Only the last 2 seats of a row can be set to couple type' });
      // Update both seats in the couple pair
      const pairIds = last2.map(s => s.id);
      await pool.query('UPDATE seats SET seat_type = $1 WHERE id = ANY($2)', [seat_type, pairIds]);
      return res.json({ message: 'Both couple seats updated', updated: 2 });
    }

    // Changing FROM couple: update partner back to standard too
    if (seat.seat_type === 'couple' && partner) {
      await pool.query('UPDATE seats SET seat_type = $1 WHERE id = $2', [seat_type, partner.id]);
    }

    await pool.query('UPDATE seats SET seat_type = $1 WHERE id = $2', [seat_type, seat.id]);
    res.json({ message: 'Seat type updated' });
  } catch (err) {
    console.error('Update seat type error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
