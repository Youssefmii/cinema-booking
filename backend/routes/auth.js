const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../database');
const { sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper: sign JWT
const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Helper: generate customer number from user id
const makeCustomerNumber = (id) => `CIN-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`;

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    // Only Gmail addresses allowed
    const gmailRegex = /^[^\s@]+@gmail\.com$/i;
    if (!gmailRegex.test(email))
      return res.status(400).json({ message: 'Only Gmail addresses are allowed (e.g. yourname@gmail.com)' });

    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const { rows: inserted } = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, hashed, 'user']
    );
    const newId = inserted[0].id;
    const customerNumber = makeCustomerNumber(newId);
    await pool.query('UPDATE users SET customer_number = $1 WHERE id = $2', [customerNumber, newId]);
    const user = { id: newId, name, email, role: 'user', customer_number: customerNumber };
    res.json({ token: signToken(user), user });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'All fields required' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const userData = { id: user.id, name: user.name, email: user.email, role: user.role, customer_number: user.customer_number };
    res.json({ token: signToken(userData), user: userData });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Google Sign-In
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Google credential required' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    // Find or create user
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = rows[0];

    if (!user) {
      // New user — create account (no password for Google users)
      const { rows: inserted } = await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, email, 'GOOGLE_AUTH_' + googleId, 'user']
      );
      const newId = inserted[0].id;
      const customerNumber = makeCustomerNumber(newId);
      await pool.query('UPDATE users SET customer_number = $1 WHERE id = $2', [customerNumber, newId]);
      user = { id: newId, name, email, role: 'user', customer_number: customerNumber };
    }

    const userData = { id: user.id, name: user.name, email: user.email, role: user.role, customer_number: user.customer_number };
    res.json({ token: signToken(userData), user: userData });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ message: 'Invalid Google token' });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    const user = rows[0];
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Invalidate previous tokens
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1', [user.id]);
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    const resetUrl = `http://localhost:5173/reset-password?token=${token}`;
    sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl })
      .catch(err => console.error('Password reset email error:', err.message));

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const { rows } = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE',
      [token]
    );
    const record = rows[0];
    if (!record) return res.status(400).json({ message: 'Invalid or expired reset link.' });
    if (new Date(record.expires_at) < new Date())
      return res.status(400).json({ message: 'Reset link has expired. Please request a new one.' });

    const hashed = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, record.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [record.id]);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
