const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendBookingConfirmation, sendCancellationEmail, sendWaitlistNotification, sendSeatRemovalEmail, sendBlacklistEmail } = require('../utils/email');

const router = express.Router();

// Parse numeric fields from PostgreSQL NUMERIC columns
const parseBooking = b => ({
  ...b,
  total_price: parseFloat(b.total_price) || 0,
});
const parseSnackInBooking = s => ({ ...s, price: parseFloat(s.price) || 0 });

router.post('/', authenticate, async (req, res) => {
  try {
    // Block blacklisted users from booking directly
    const { rows: userRows } = await pool.query('SELECT is_blacklisted FROM users WHERE id = $1', [req.user.id]);
    if (userRows[0]?.is_blacklisted) {
      return res.status(403).json({
        message: 'Your account has been restricted due to a late cancellation. Please contact a staff member to make bookings.',
        blacklisted: true,
      });
    }

    const { showtime_id, seat_ids, snacks } = req.body;
    if (!showtime_id || !seat_ids || !seat_ids.length)
      return res.status(400).json({ message: 'showtime_id and seat_ids required' });

    const { rows: stRows } = await pool.query(
      'SELECT s.*, m.title as movie_title, h.name as hall_name FROM showtimes s JOIN movies m ON s.movie_id=m.id JOIN halls h ON s.hall_id=h.id WHERE s.id=$1',
      [showtime_id]
    );
    if (!stRows[0]) return res.status(404).json({ message: 'Showtime not found' });
    const showtime = stRows[0];

    const { rows: bookedRows } = await pool.query(
      "SELECT bs.seat_id FROM booking_seats bs JOIN bookings b ON bs.booking_id=b.id WHERE b.showtime_id=$1 AND b.status!='cancelled'",
      [showtime_id]
    );
    const bookedIds = new Set(bookedRows.map(r => r.seat_id));
    const conflict = seat_ids.find(id => bookedIds.has(id));
    if (conflict) return res.status(409).json({ message: 'One or more seats already booked' });

    const seatRowsResult = await Promise.all(
      seat_ids.map(id => pool.query('SELECT * FROM seats WHERE id=$1', [id]).then(r => r.rows[0]))
    );
    const seatRows = seatRowsResult;

    let total = 0;
    seatRows.forEach(s => {
      if (s.seat_type === 'vip') total += parseFloat(showtime.price_vip);
      else if (s.seat_type === 'couple') total += parseFloat(showtime.price_couple);
      else total += parseFloat(showtime.price_standard);
    });

    const snackItems = [];
    if (snacks && snacks.length) {
      for (const { snack_id, quantity } of snacks) {
        const { rows: snackRows } = await pool.query('SELECT * FROM snacks WHERE id=$1', [snack_id]);
        const snack = snackRows[0];
        if (snack) {
          total += parseFloat(snack.price) * quantity;
          snackItems.push({ ...snack, quantity });
        }
      }
    }

    const reference = 'CB-' + uuidv4().slice(0, 8).toUpperCase();

    const client = await pool.connect();
    let bookingId;
    try {
      await client.query('BEGIN');
      const { rows: bRows } = await client.query(
        'INSERT INTO bookings (user_id, showtime_id, reference_number, total_price) VALUES ($1, $2, $3, $4) RETURNING id',
        [req.user.id, showtime_id, reference, total]
      );
      bookingId = bRows[0].id;
      for (const sid of seat_ids) {
        await client.query('INSERT INTO booking_seats (booking_id, seat_id) VALUES ($1, $2)', [bookingId, sid]);
      }
      if (snacks && snacks.length) {
        for (const { snack_id, quantity } of snacks) {
          await client.query('INSERT INTO booking_snacks (booking_id, snack_id, quantity) VALUES ($1, $2, $3)', [bookingId, snack_id, quantity]);
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { rows: userFull } = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = userFull[0];
    sendBookingConfirmation({
      to: user.email, name: user.name, reference,
      movie: showtime.movie_title, showtime: showtime.datetime,
      seats: seatRows, snacks: snackItems, total,
    }).catch(err => console.error('Email error:', err.message));

    res.status(201).json({ reference, total, booking_id: bookingId });
  } catch (err) {
    console.error('Create booking error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my', authenticate, async (req, res) => {
  try {
    const { rows: bookings } = await pool.query(
      'SELECT b.*, s.datetime, s.movie_id, s.price_standard, s.price_vip, s.price_couple, m.title as movie_title, m.poster_url, h.name as hall_name FROM bookings b JOIN showtimes s ON b.showtime_id=s.id JOIN movies m ON s.movie_id=m.id JOIN halls h ON s.hall_id=h.id WHERE b.user_id=$1 ORDER BY b.created_at DESC',
      [req.user.id]
    );

    const result = await Promise.all(bookings.map(async b => {
      const [{ rows: seats }, { rows: snacks }] = await Promise.all([
        pool.query('SELECT se.* FROM booking_seats bs JOIN seats se ON bs.seat_id=se.id WHERE bs.booking_id=$1', [b.id]),
        pool.query('SELECT sn.*, bs.quantity FROM booking_snacks bs JOIN snacks sn ON bs.snack_id=sn.id WHERE bs.booking_id=$1', [b.id]),
      ]);
      return { ...parseBooking(b), seats, snacks: snacks.map(parseSnackInBooking) };
    }));

    res.json(result);
  } catch (err) {
    console.error('Get my bookings error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/ref/:reference', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT b.*, s.datetime, m.title as movie_title, m.poster_url, h.name as hall_name FROM bookings b JOIN showtimes s ON b.showtime_id=s.id JOIN movies m ON s.movie_id=m.id JOIN halls h ON s.hall_id=h.id WHERE b.reference_number=$1',
      [req.params.reference]
    );
    const booking = rows[0];
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Forbidden' });

    const [{ rows: seats }, { rows: snacks }] = await Promise.all([
      pool.query('SELECT se.* FROM booking_seats bs JOIN seats se ON bs.seat_id=se.id WHERE bs.booking_id=$1', [booking.id]),
      pool.query('SELECT sn.*, bs.quantity FROM booking_snacks bs JOIN snacks sn ON bs.snack_id=sn.id WHERE bs.booking_id=$1', [booking.id]),
    ]);
    res.json({ ...parseBooking(booking), seats, snacks: snacks.map(parseSnackInBooking) });
  } catch (err) {
    console.error('Get booking by ref error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { movie_id, date } = req.query;
    let query = 'SELECT b.*, s.datetime, m.title as movie_title, h.name as hall_name, u.name as user_name, u.email as user_email, u.customer_number as user_customer_number FROM bookings b JOIN showtimes s ON b.showtime_id=s.id JOIN movies m ON s.movie_id=m.id JOIN halls h ON s.hall_id=h.id JOIN users u ON b.user_id=u.id WHERE 1=1';
    const params = [];
    if (movie_id) {
      params.push(movie_id);
      query += ` AND s.movie_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND DATE(s.datetime) = $${params.length}`;
    }
    query += ' ORDER BY b.created_at DESC';

    const { rows: bookings } = await pool.query(query, params);

    const result = await Promise.all(bookings.map(async b => {
      const [{ rows: seats }, { rows: snacks }] = await Promise.all([
        pool.query('SELECT se.* FROM booking_seats bs JOIN seats se ON bs.seat_id=se.id WHERE bs.booking_id=$1', [b.id]),
        pool.query('SELECT sn.*, bs.quantity FROM booking_snacks bs JOIN snacks sn ON bs.snack_id=sn.id WHERE bs.booking_id=$1', [b.id]),
      ]);
      return { ...parseBooking(b), seats, snacks: snacks.map(parseSnackInBooking) };
    }));

    res.json(result);
  } catch (err) {
    console.error('Get all bookings error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id/cancel', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT b.*, s.datetime, m.title as movie_title, u.name as user_name, u.email as user_email FROM bookings b JOIN showtimes s ON b.showtime_id = s.id JOIN movies m ON s.movie_id = m.id JOIN users u ON b.user_id = u.id WHERE b.id = $1',
      [req.params.id]
    );
    const booking = rows[0];
    if (!booking) return res.status(404).json({ message: 'Not found' });
    if (booking.user_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Forbidden' });
    if (booking.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });

    await pool.query("UPDATE bookings SET status='cancelled' WHERE id=$1", [req.params.id]);

    const { rows: seats } = await pool.query(
      'SELECT se.* FROM booking_seats bs JOIN seats se ON bs.seat_id = se.id WHERE bs.booking_id = $1',
      [req.params.id]
    );

    const cancelledBy = req.user.id === booking.user_id ? 'user' : 'admin';

    // Auto-blacklist if user cancels within 2 hours of showtime
    if (cancelledBy === 'user') {
      const showtimeDate = new Date(booking.datetime);
      const minutesUntil = (showtimeDate - new Date()) / (1000 * 60);
      if (minutesUntil >= 0 && minutesUntil < 120) {
        await pool.query('UPDATE users SET is_blacklisted = TRUE WHERE id = $1', [req.user.id]);
        sendBlacklistEmail({ to: booking.user_email, name: booking.user_name })
          .catch(err => console.error('Blacklist email error:', err.message));
      }
    }

    sendCancellationEmail({
      to: booking.user_email, name: booking.user_name,
      reference: booking.reference_number, movie: booking.movie_title,
      showtime: booking.datetime, seats, total: booking.total_price,
      cancelledBy,
    }).catch(err => console.error('Cancellation email error:', err.message));

    const { rows: waitlistUsers } = await pool.query(
      "SELECT w.*, u.name as user_name, u.email as user_email FROM waitlist w JOIN users u ON w.user_id = u.id WHERE w.showtime_id = $1 AND w.status = 'waiting' ORDER BY w.created_at ASC",
      [booking.showtime_id]
    );
    for (const wu of waitlistUsers) {
      sendWaitlistNotification({
        to: wu.user_email, name: wu.user_name,
        movie: booking.movie_title, showtime: booking.datetime,
        showtimeId: booking.showtime_id,
      }).catch(err => console.error('Waitlist email error:', err.message));
      await pool.query("UPDATE waitlist SET status = 'notified' WHERE id = $1", [wu.id]);
    }

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error('Cancel booking error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: book on behalf of a user by email
router.post('/admin/book', authenticate, requireAdmin, async (req, res) => {
  try {
    const { user_email, showtime_id, seat_ids, snacks } = req.body;
    if (!user_email || !showtime_id || !seat_ids || !seat_ids.length)
      return res.status(400).json({ message: 'user_email, showtime_id and seat_ids are required' });

    const { rows: userRows } = await pool.query('SELECT * FROM users WHERE email = $1', [user_email.trim().toLowerCase()]);
    const user = userRows[0];
    if (!user) return res.status(404).json({ message: 'No user found with that email' });

    const { rows: stRows } = await pool.query(
      'SELECT s.*, m.title as movie_title, h.name as hall_name FROM showtimes s JOIN movies m ON s.movie_id=m.id JOIN halls h ON s.hall_id=h.id WHERE s.id=$1',
      [showtime_id]
    );
    if (!stRows[0]) return res.status(404).json({ message: 'Showtime not found' });
    const showtime = stRows[0];

    const { rows: bookedRows } = await pool.query(
      "SELECT bs.seat_id FROM booking_seats bs JOIN bookings b ON bs.booking_id=b.id WHERE b.showtime_id=$1 AND b.status!='cancelled'",
      [showtime_id]
    );
    const bookedIds = new Set(bookedRows.map(r => r.seat_id));
    const conflict = seat_ids.find(id => bookedIds.has(id));
    if (conflict) return res.status(409).json({ message: 'One or more seats already booked' });

    const seatRows = await Promise.all(
      seat_ids.map(id => pool.query('SELECT * FROM seats WHERE id=$1', [id]).then(r => r.rows[0]))
    );

    let total = 0;
    seatRows.forEach(s => {
      if (s.seat_type === 'vip') total += parseFloat(showtime.price_vip);
      else if (s.seat_type === 'couple') total += parseFloat(showtime.price_couple);
      else total += parseFloat(showtime.price_standard);
    });

    const snackItems = [];
    if (snacks && snacks.length) {
      for (const { snack_id, quantity } of snacks) {
        const { rows: snackRows } = await pool.query('SELECT * FROM snacks WHERE id=$1', [snack_id]);
        const snack = snackRows[0];
        if (snack) {
          total += parseFloat(snack.price) * quantity;
          snackItems.push({ ...snack, quantity });
        }
      }
    }

    const reference = 'CB-' + uuidv4().slice(0, 8).toUpperCase();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: bRows } = await client.query(
        'INSERT INTO bookings (user_id, showtime_id, reference_number, total_price) VALUES ($1, $2, $3, $4) RETURNING id',
        [user.id, showtime_id, reference, total]
      );
      const bookingId = bRows[0].id;
      for (const sid of seat_ids) {
        await client.query('INSERT INTO booking_seats (booking_id, seat_id) VALUES ($1, $2)', [bookingId, sid]);
      }
      if (snacks && snacks.length) {
        for (const { snack_id, quantity } of snacks) {
          await client.query('INSERT INTO booking_snacks (booking_id, snack_id, quantity) VALUES ($1, $2, $3)', [bookingId, snack_id, quantity]);
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    sendBookingConfirmation({
      to: user.email, name: user.name, reference,
      movie: showtime.movie_title, showtime: showtime.datetime,
      seats: seatRows, snacks: snackItems, total,
    }).catch(err => console.error('Email error:', err.message));

    res.status(201).json({ reference, total, user_name: user.name });
  } catch (err) {
    console.error('Admin book error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: remove specific seats from a booking
router.delete('/:id/seats/:seatId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows: bRows } = await pool.query(
      'SELECT b.*, s.datetime, s.price_standard, s.price_vip, s.price_couple, m.title as movie_title, u.name as user_name, u.email as user_email ' +
      'FROM bookings b JOIN showtimes s ON b.showtime_id = s.id JOIN movies m ON s.movie_id = m.id JOIN users u ON b.user_id = u.id WHERE b.id = $1',
      [req.params.id]
    );
    const booking = bRows[0];

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status === 'cancelled') return res.status(400).json({ message: 'Booking is already cancelled' });

    const { rows: seatRows } = await pool.query(
      'SELECT se.* FROM booking_seats bs JOIN seats se ON bs.seat_id = se.id WHERE bs.booking_id = $1 AND se.id = $2',
      [req.params.id, req.params.seatId]
    );
    const seat = seatRows[0];

    if (!seat) return res.status(404).json({ message: 'Seat not found in this booking' });

    // Calculate price of the seat being removed
    const priceMap = {
      vip: parseFloat(booking.price_vip),
      couple: parseFloat(booking.price_couple),
      standard: parseFloat(booking.price_standard)
    };
    const seatPrice = priceMap[seat.seat_type] || parseFloat(booking.price_standard);

    // Remove the seat
    await pool.query('DELETE FROM booking_seats WHERE booking_id = $1 AND seat_id = $2', [req.params.id, req.params.seatId]);

    // Check remaining seats
    const { rows: remainingSeats } = await pool.query(
      'SELECT se.* FROM booking_seats bs JOIN seats se ON bs.seat_id = se.id WHERE bs.booking_id = $1',
      [req.params.id]
    );

    // Notify waitlist users — a seat just freed up
    const notifyWaitlist = async () => {
      const { rows: waitlistUsers } = await pool.query(
        "SELECT w.*, u.name as user_name, u.email as user_email FROM waitlist w JOIN users u ON w.user_id = u.id WHERE w.showtime_id = $1 AND w.status = 'waiting' ORDER BY w.created_at ASC",
        [booking.showtime_id]
      );
      for (const wu of waitlistUsers) {
        sendWaitlistNotification({
          to: wu.user_email, name: wu.user_name,
          movie: booking.movie_title, showtime: booking.datetime,
          showtimeId: booking.showtime_id,
        }).catch(err => console.error('Waitlist email error:', err.message));
        await pool.query("UPDATE waitlist SET status = 'notified' WHERE id = $1", [wu.id]);
      }
    };

    if (remainingSeats.length === 0) {
      // No seats left — cancel the whole booking
      await pool.query("UPDATE bookings SET status='cancelled', total_price=0 WHERE id=$1", [req.params.id]);
      sendCancellationEmail({
        to: booking.user_email, name: booking.user_name,
        reference: booking.reference_number, movie: booking.movie_title,
        showtime: booking.datetime, seats: [seat], total: booking.total_price,
        cancelledBy: 'admin',
      }).catch(err => console.error('Cancellation email error:', err.message));
      await notifyWaitlist();
      return res.json({ message: 'Last seat removed — booking cancelled', status: 'cancelled' });
    }

    const newTotal = Math.max(0, parseFloat(booking.total_price) - seatPrice);
    await pool.query('UPDATE bookings SET total_price = $1 WHERE id = $2', [newTotal, req.params.id]);

    sendSeatRemovalEmail({
      to: booking.user_email, name: booking.user_name,
      reference: booking.reference_number, movie: booking.movie_title,
      showtime: booking.datetime,
      removedSeats: [seat],
      remainingSeats,
      newTotal,
    }).catch(err => console.error('Seat removal email error:', err.message));
    await notifyWaitlist();

    res.json({ message: 'Seat removed', newTotal, remainingSeats });
  } catch (err) {
    console.error('Remove seat error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
