const express = require('express');
const pool = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM movies WHERE is_active = TRUE ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get movies error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM movies ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get all movies error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM movies WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Movie not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Get movie error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, genre, duration, description, poster_url } = req.body;
    if (!title || !genre || !duration) return res.status(400).json({ message: 'title, genre, duration required' });
    const { rows } = await pool.query(
      'INSERT INTO movies (title, genre, duration, description, poster_url) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [title, genre, duration, description || '', poster_url || '']
    );
    res.status(201).json({ id: rows[0].id, title, genre, duration, description, poster_url, is_active: true });
  } catch (err) {
    console.error('Create movie error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, genre, duration, description, poster_url, is_active } = req.body;
    const { rows } = await pool.query('SELECT * FROM movies WHERE id = $1', [req.params.id]);
    const movie = rows[0];
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    await pool.query(
      'UPDATE movies SET title=$1, genre=$2, duration=$3, description=$4, poster_url=$5, is_active=$6 WHERE id=$7',
      [title ?? movie.title, genre ?? movie.genre, duration ?? movie.duration, description ?? movie.description, poster_url ?? movie.poster_url, is_active ?? movie.is_active, req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error('Update movie error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM movies WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete movie error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
