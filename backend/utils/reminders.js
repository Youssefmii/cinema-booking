const pool = require('../database');
const { sendReminderEmail } = require('./email');

function startReminderJob() {
  const check = async () => {
    try {
      const now = new Date();
      // Window: showtime is between 23h and 25h from now
      const from = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
      const to   = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

      const { rows: bookings } = await pool.query(`
        SELECT b.*, s.datetime, m.title as movie_title, h.name as hall_name,
               u.name as user_name, u.email as user_email
        FROM bookings b
        JOIN showtimes s ON b.showtime_id = s.id
        JOIN movies m ON s.movie_id = m.id
        JOIN halls h ON s.hall_id = h.id
        JOIN users u ON b.user_id = u.id
        WHERE b.status = 'confirmed'
          AND b.reminder_sent = FALSE
          AND s.datetime >= $1 AND s.datetime <= $2
      `, [from, to]);

      for (const booking of bookings) {
        const { rows: seats } = await pool.query(
          'SELECT se.* FROM booking_seats bs JOIN seats se ON bs.seat_id = se.id WHERE bs.booking_id = $1',
          [booking.id]
        );

        sendReminderEmail({
          to: booking.user_email,
          name: booking.user_name,
          movie: booking.movie_title,
          showtime: booking.datetime,
          hall: booking.hall_name,
          seats,
          reference: booking.reference_number,
        }).then(async () => {
          await pool.query('UPDATE bookings SET reminder_sent = TRUE WHERE id = $1', [booking.id]);
          console.log(`Reminder sent for booking ${booking.reference_number}`);
        }).catch(err => console.error('Reminder email error:', err.message));
      }
    } catch (err) {
      console.error('Reminder job error:', err.message);
    }
  };

  check(); // run once on server start
  setInterval(check, 15 * 60 * 1000); // then every 15 minutes
}

module.exports = { startReminderJob };
