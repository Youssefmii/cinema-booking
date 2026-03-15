const express = require('express');
const pool = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// GET /api/movies/:movieId/reviews
router.get('/', async (req, res) => {
  try {
    const { rows: reviews } = await pool.query(`
      SELECT r.*, u.name as user_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.movie_id = $1
      ORDER BY r.created_at DESC
    `, [req.params.movieId]);

    const avgRating = reviews.length
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : null;

    res.json({ reviews, avgRating, count: reviews.length });
  } catch (err) {
    console.error('Get reviews error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/movies/:movieId/reviews — create or update own review
router.post('/', authenticate, async (req, res) => {
  try {
    const movieId = req.params.movieId;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });

    const { rows: existing } = await pool.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND movie_id = $2',
      [req.user.id, movieId]
    );

    if (existing.length > 0) {
      // Update existing review — no eligibility re-check needed
      await pool.query(
        'UPDATE reviews SET rating = $1, comment = $2 WHERE id = $3',
        [rating, comment || null, existing[0].id]
      );
      return res.json({ message: 'Review updated' });
    }

    // Check if user has a confirmed booking for this movie
    const { rows: bookingRows } = await pool.query(`
      SELECT b.id FROM bookings b
      JOIN showtimes s ON b.showtime_id = s.id
      WHERE b.user_id = $1 AND s.movie_id = $2 AND b.status = 'confirmed'
      LIMIT 1
    `, [req.user.id, movieId]);
    if (bookingRows.length === 0)
      return res.status(403).json({ message: 'You can only review movies you have booked' });

    await pool.query(
      'INSERT INTO reviews (user_id, movie_id, rating, comment) VALUES ($1, $2, $3, $4)',
      [req.user.id, movieId, rating, comment || null]
    );
    res.status(201).json({ message: 'Review submitted' });
  } catch (err) {
    console.error('Post review error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/movies/:movieId/reviews/:reviewId (admin only)
router.delete('/:reviewId', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM reviews WHERE id = $1 AND movie_id = $2',
      [req.params.reviewId, req.params.movieId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Review not found' });
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('Delete review error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
