const express = require('express');
const pool = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const ROWS = ['A','B','C','D','E','F','G','H','I','J'];

async function generateSeats(client, hallId, rows, seatsPerRow) {
  for (let r = 0; r < rows; r++) {
    for (let s = 1; s <= seatsPerRow; s++) {
      let type = 'standard';
      if (r === 0) type = 'vip';
      else if (s === seatsPerRow || s === seatsPerRow - 1) type = 'couple';
      const rowLabel = ROWS[r] || String.fromCharCode(65 + r);
      await client.query(
        'INSERT INTO seats (hall_id, row_label, seat_number, seat_type) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [hallId, rowLabel, s, type]
      );
    }
  }
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM halls');
    res.json(rows);
  } catch (err) {
    console.error('Get halls error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows: hallRows } = await pool.query('SELECT * FROM halls WHERE id = $1', [req.params.id]);
    if (!hallRows[0]) return res.status(404).json({ message: 'Hall not found' });
    const hall = hallRows[0];
    const { rows: seats } = await pool.query(
      'SELECT * FROM seats WHERE hall_id = $1 ORDER BY row_label, seat_number',
      [req.params.id]
    );
    res.json({ ...hall, seats });
  } catch (err) {
    console.error('Get hall error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, rows = 10, seats_per_row = 10 } = req.body;
  if (!name) return res.status(400).json({ message: 'Hall name required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: inserted } = await client.query(
      'INSERT INTO halls (name, rows, seats_per_row) VALUES ($1, $2, $3) RETURNING id',
      [name, rows, seats_per_row]
    );
    const hallId = inserted[0].id;
    await generateSeats(client, hallId, rows, seats_per_row);
    await client.query('COMMIT');
    res.status(201).json({ id: hallId, name, rows, seats_per_row });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create hall error:', err.message);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const { rows } = await pool.query('SELECT * FROM halls WHERE id = $1', [req.params.id]);
    const hall = rows[0];
    if (!hall) return res.status(404).json({ message: 'Hall not found' });
    await pool.query('UPDATE halls SET name=$1 WHERE id=$2', [name ?? hall.name, req.params.id]);
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error('Update hall error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM halls WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete hall error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
