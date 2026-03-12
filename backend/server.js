require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { startReminderJob } = require('./utils/reminders');

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

// Serve React frontend build in production
const frontendBuild = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ message: 'Not found' });
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startReminderJob();
  });
} else {
  startReminderJob();
}

module.exports = app;
