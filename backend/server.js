require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { startReminderJob } = require('./utils/reminders');

// Importing the pool initializes the SQLite database and creates all tables.
require('./database');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/movies/:movieId/reviews', require('./routes/reviews'));
app.use('/api/halls', require('./routes/halls'));
app.use('/api/showtimes', require('./routes/showtimes'));
app.use('/api/seats', require('./routes/seats'));
app.use('/api/snacks', require('./routes/snacks'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/users', require('./routes/users'));
app.use('/api/waitlist', require('./routes/waitlist'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startReminderJob();
});

module.exports = app;
