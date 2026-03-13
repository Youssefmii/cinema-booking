const express = require('express');
const pool = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const parseSnack = s => ({ ...s, price: parseFloat(s.price) });

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM snacks WHERE is_available = TRUE ORDER BY category, name');
    res.json(rows.map(parseSnack));
  } catch (err) {
    console.error('Get snacks error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM snacks ORDER BY category, name');
    res.json(rows.map(parseSnack));
  } catch (err) {
    console.error('Get all snacks error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, price, category, image_url } = req.body;
    if (!name || !price) return res.status(400).json({ message: 'name and price required' });
    const { rows } = await pool.query(
      'INSERT INTO snacks (name, price, category, image_url) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, price, category || 'other', image_url || '']
    );
    res.status(201).json({ id: rows[0].id, name, price, category, image_url, is_available: true });
  } catch (err) {
    console.error('Create snack error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, price, category, image_url, is_available } = req.body;
    const { rows } = await pool.query('SELECT * FROM snacks WHERE id = $1', [req.params.id]);
    const snack = rows[0];
    if (!snack) return res.status(404).json({ message: 'Snack not found' });
    await pool.query(
      'UPDATE snacks SET name=$1, price=$2, category=$3, image_url=$4, is_available=$5 WHERE id=$6',
      [name ?? snack.name, price ?? snack.price, category ?? snack.category, image_url ?? snack.image_url, is_available ?? snack.is_available, req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error('Update snack error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM snacks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete snack error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
