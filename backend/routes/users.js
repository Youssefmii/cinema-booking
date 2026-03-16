const express = require('express');
const pool = require('../database');
const bcrypt = require('bcryptjs');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, customer_number, is_blacklisted, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Get me error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, customer_number, is_blacklisted, created_at FROM users ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Get users error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/lookup', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: 'email query param required' });
    const { rows } = await pool.query(
      'SELECT id, name, email, role, customer_number, is_blacklisted FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    if (!rows[0]) return res.status(404).json({ message: 'No user found with that email' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Lookup user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: create a new user
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });
    if (!['user', 'admin'].includes(role))
      return res.status(400).json({ message: 'Invalid role' });

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (existing.length) return res.status(409).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const { rows: inserted } = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [name.trim(), email.trim().toLowerCase(), hashed, role]
    );
    const newId = inserted[0].id;
    const customerNumber = `CIN-${new Date().getFullYear()}-${String(newId).padStart(4, '0')}`;
    await pool.query('UPDATE users SET customer_number = $1 WHERE id = $2', [customerNumber, newId]);
    const { rows } = await pool.query(
      'SELECT id, name, email, role, customer_number, created_at FROM users WHERE id = $1', [newId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: update user details
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (email && email.trim().toLowerCase() !== user.email) {
      const { rows: dup } = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.trim().toLowerCase(), req.params.id]);
      if (dup.length) return res.status(409).json({ message: 'Email already in use by another user' });
    }

    await pool.query(
      'UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4',
      [name || user.name, (email || user.email).trim().toLowerCase(), role || user.role, req.params.id]
    );
    res.json({ message: 'User updated' });
  } catch (err) {
    console.error('Update user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: delete a user (cannot delete admins)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, role FROM users WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    if (rows[0].role === 'admin') return res.status(400).json({ message: 'Cannot delete an admin account' });

    const userId = req.params.id;
    // Delete related data to avoid foreign key constraint errors
    const { rows: bookings } = await pool.query('SELECT id FROM bookings WHERE user_id = $1', [userId]);
    for (const b of bookings) {
      await pool.query('DELETE FROM booking_snacks WHERE booking_id = $1', [b.id]);
      await pool.query('DELETE FROM booking_seats WHERE booking_id = $1', [b.id]);
    }
    await pool.query('DELETE FROM bookings WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM waitlist WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM reviews WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: toggle blacklist status for a user
router.patch('/:id/blacklist', authenticate, requireAdmin, async (req, res) => {
  try {
    const { blacklisted } = req.body;
    const { rows } = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.params.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot blacklist an admin' });

    const newValue = !!blacklisted;
    await pool.query('UPDATE users SET is_blacklisted = $1 WHERE id = $2', [newValue, req.params.id]);
    res.json({ message: blacklisted ? 'User blacklisted' : 'User removed from blacklist', is_blacklisted: newValue });
  } catch (err) {
    console.error('Blacklist user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
