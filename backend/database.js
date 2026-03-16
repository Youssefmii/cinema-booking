const { Pool, types } = require('pg');

// Override pg type parsers to return timestamp strings as-is
// This prevents JS Date timezone conversion issues on Vercel
types.setTypeParser(1114, str => str); // TIMESTAMP WITHOUT TIME ZONE
types.setTypeParser(1184, str => str); // TIMESTAMP WITH TIME ZONE

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
