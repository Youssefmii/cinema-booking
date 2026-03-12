require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const pool = require('../database');

const ROWS = ['A','B','C','D','E','F','G','H','I','J'];

async function seed() {
  console.log('Seeding database...');

  // Admin user
  const adminPass = await bcrypt.hash('admin123', 10);
  await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
    ['Admin', 'admin@cinema.com', adminPass, 'admin']
  );

  // Demo user
  const userPass = await bcrypt.hash('user123', 10);
  await pool.query(
    'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
    ['John Doe', 'john@example.com', userPass, 'user']
  );

  // Backfill customer numbers for users without one
  const { rows: usersWithout } = await pool.query('SELECT id FROM users WHERE customer_number IS NULL');
  const year = new Date().getFullYear();
  for (const u of usersWithout) {
    const customerNumber = `CIN-${year}-${String(u.id).padStart(4, '0')}`;
    await pool.query('UPDATE users SET customer_number = $1 WHERE id = $2', [customerNumber, u.id]);
  }

  // Movies
  const movies = [
    { title: 'Inception', genre: 'Sci-Fi', duration: 148, description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.', poster_url: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg' },
    { title: 'The Dark Knight', genre: 'Action', duration: 152, description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.', poster_url: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
    { title: 'Interstellar', genre: 'Sci-Fi', duration: 169, description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.", poster_url: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
    { title: 'Avengers: Endgame', genre: 'Action', duration: 181, description: 'After the devastating events of Avengers: Infinity War, the universe is in ruins. The Avengers assemble once more.', poster_url: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg' },
    { title: 'The Lion King', genre: 'Animation', duration: 118, description: 'After the murder of his father, a young lion prince flees his kingdom only to learn the true meaning of responsibility and bravery.', poster_url: 'https://image.tmdb.org/t/p/w500/2bXbqYdUdNVa8VIWXVfclP2ICtT.jpg' },
    { title: 'Parasite', genre: 'Thriller', duration: 132, description: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.', poster_url: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg' },
  ];

  for (const m of movies) {
    await pool.query(
      'INSERT INTO movies (title, genre, duration, description, poster_url) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
      [m.title, m.genre, m.duration, m.description, m.poster_url]
    );
  }

  // Halls
  const hallNames = ['Hall 1', 'Hall 2', 'Hall 3'];
  const hallIds = [];

  for (const name of hallNames) {
    const { rows: existing } = await pool.query('SELECT id FROM halls WHERE name=$1', [name]);
    if (existing.length > 0) {
      hallIds.push(existing[0].id);
      continue;
    }
    const { rows: inserted } = await pool.query(
      'INSERT INTO halls (name, rows, seats_per_row) VALUES ($1, $2, $3) RETURNING id',
      [name, 10, 10]
    );
    const hallId = inserted[0].id;
    hallIds.push(hallId);
    // Generate seats
    for (let r = 0; r < 10; r++) {
      for (let s = 1; s <= 10; s++) {
        let type = 'standard';
        if (r === 0) type = 'vip';
        else if (s === 9 || s === 10) type = 'couple';
        await pool.query(
          'INSERT INTO seats (hall_id, row_label, seat_number, seat_type) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          [hallId, ROWS[r], s, type]
        );
      }
    }
  }

  // Showtimes — next 7 days
  const { rows: movieRows } = await pool.query('SELECT id FROM movies');
  const movieIds = movieRows.map(r => r.id);
  const now = new Date();
  let stCount = 0;

  for (let day = 0; day < 7; day++) {
    const times = ['10:00', '13:30', '17:00', '20:30'];
    for (const time of times) {
      const dt = new Date(now);
      dt.setDate(dt.getDate() + day);
      const [h, m] = time.split(':');
      dt.setHours(parseInt(h), parseInt(m), 0, 0);
      const hallId = hallIds[stCount % hallIds.length];
      const movieId = movieIds[stCount % movieIds.length];
      const datetime = dt.toISOString();
      const { rows: existing } = await pool.query(
        'SELECT id FROM showtimes WHERE hall_id=$1 AND datetime=$2',
        [hallId, datetime]
      );
      if (!existing.length) {
        await pool.query(
          'INSERT INTO showtimes (movie_id, hall_id, datetime, price_standard, price_vip, price_couple) VALUES ($1, $2, $3, $4, $5, $6)',
          [movieId, hallId, datetime, 12, 22, 35]
        );
      }
      stCount++;
    }
  }

  // Snacks
  const snacks = [
    { name: 'Large Popcorn', price: 6.50, category: 'food', image_url: '' },
    { name: 'Medium Popcorn', price: 4.50, category: 'food', image_url: '' },
    { name: 'Small Popcorn', price: 3.00, category: 'food', image_url: '' },
    { name: 'Nachos', price: 5.50, category: 'food', image_url: '' },
    { name: 'Hot Dog', price: 5.00, category: 'food', image_url: '' },
    { name: 'Cola (Large)', price: 4.00, category: 'drinks', image_url: '' },
    { name: 'Cola (Medium)', price: 3.00, category: 'drinks', image_url: '' },
    { name: 'Water', price: 2.00, category: 'drinks', image_url: '' },
    { name: 'Orange Juice', price: 3.50, category: 'drinks', image_url: '' },
    { name: 'M&Ms', price: 3.50, category: 'candy', image_url: '' },
    { name: 'Gummy Bears', price: 3.00, category: 'candy', image_url: '' },
    { name: 'Chocolate Bar', price: 2.50, category: 'candy', image_url: '' },
  ];

  for (const s of snacks) {
    await pool.query(
      'INSERT INTO snacks (name, price, category, image_url) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [s.name, s.price, s.category, s.image_url]
    );
  }

  console.log('Seed complete!');
  console.log('  Admin: admin@cinema.com / admin123');
  console.log('  User:  john@example.com / user123');

  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
