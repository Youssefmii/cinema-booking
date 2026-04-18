require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../database');

async function seedShowtimes() {
  console.log('Seeding showtimes from April 9 to May 28, 2026...');

  const { rows: movies } = await pool.query('SELECT id, title FROM movies WHERE is_active = 1');
  const { rows: halls } = await pool.query('SELECT id, name FROM halls ORDER BY id');

  if (!movies.length || !halls.length) {
    console.error('No movies or halls found!');
    process.exit(1);
  }

  console.log(`Found ${movies.length} movies and ${halls.length} halls`);

  const startDate = new Date('2026-04-09');
  const endDate = new Date('2026-05-28');
  const timeSlots = ['11:00', '14:00', '17:00', '20:00', '23:00'];

  let created = 0;
  let skipped = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    for (let hi = 0; hi < halls.length; hi++) {
      const hall = halls[hi];
      for (let ti = 0; ti < timeSlots.length; ti++) {
        // Rotate movies across halls and time slots
        const movieIndex = (d.getDate() + hi + ti) % movies.length;
        const movie = movies[movieIndex];

        const [h, m] = timeSlots[ti].split(':');
        const dt = new Date(d);
        dt.setHours(parseInt(h), parseInt(m), 0, 0);
        const datetime = dt.toISOString();

        // Check if this slot already has a showtime
        const { rows: existing } = await pool.query(
          'SELECT id FROM showtimes WHERE hall_id=$1 AND datetime=$2',
          [hall.id, datetime]
        );

        if (existing.length) {
          skipped++;
          continue;
        }

        await pool.query(
          'INSERT INTO showtimes (movie_id, hall_id, datetime, price_standard, price_vip, price_couple) VALUES ($1, $2, $3, $4, $5, $6)',
          [movie.id, hall.id, datetime, 12, 22, 35]
        );
        created++;
      }
    }
  }

  console.log(`Done! Created ${created} showtimes, skipped ${skipped} (already existed)`);
}

seedShowtimes().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
