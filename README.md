# Cinema Booking System

A full-stack cinema booking platform with real-time seat selection, multi-step booking flow, email confirmations, and a complete admin dashboard.

**[Live Demo](https://cinema-booking-flame.vercel.app)**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React, Vite, Tailwind CSS v4 |
| **Backend** | Node.js, Express |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | JWT (bcryptjs) |
| **Email** | Nodemailer (Gmail SMTP) |
| **Deployment** | Vercel (serverless) |

## Features

### User-Facing
- Browse movies with posters, genre-colored badges, duration, and descriptions
- Filter showtimes by date using a dropdown date picker
- Interactive seat selection grid with 3 seat types: VIP (Row A), Couple (last 2 seats/row), Standard
- Add snacks (food, drinks, candy) during booking
- Multi-step booking flow: showtime → seats → snacks → payment → confirmation
- Email confirmation with booking details and QR-ready booking reference
- Cancel bookings (with 2-hour policy — late cancellations trigger account restriction)
- Star ratings and written reviews for movies you've watched
- Waitlist system — get notified when sold-out showtimes have cancellations
- Forgot password with email reset link

### Admin Dashboard
- Manage movies (add, edit, delete, toggle active/inactive)
- Manage showtimes (single or recurring — daily/weekly)
- Manage halls and seat configurations
- Manage snack menu with categories and pricing
- View and manage all bookings
- User management (edit roles, blacklist, delete)
- Book on behalf of users (walk-in customers)

### Security
- Gmail-only registration
- JWT authentication with role-based access control
- Blacklist system for policy violations
- Password reset via secure token

## Screenshots

### User Experience

| Homepage | Movie Detail & Date Picker |
|----------|---------------------------|
| ![Homepage](screenshots/homepage.png) | ![Movie Detail](screenshots/movie-detail.png) |

| Seat Selection | Snack Selection |
|---------------|-----------------|
| ![Seat Selection](screenshots/seat-selection.png) | ![Snack Selection](screenshots/snack-selection.png) |

| Booking Confirmation | My Bookings |
|---------------------|-------------|
| ![Booking Confirmation](screenshots/booking-confirmation.png) | ![My Bookings](screenshots/my-bookings.png) |

| Email Confirmation | Login |
|-------------------|-------|
| ![Email Confirmation](screenshots/email-confirmation.png) | ![Login](screenshots/login.png) |

### Admin Dashboard

| Dashboard | Movies Management |
|-----------|-------------------|
| ![Admin Dashboard](screenshots/admin-dashboard.png) | ![Admin Movies](screenshots/admin-movies.png) |

| Showtimes | Halls Management |
|-----------|-----------------|
| ![Admin Showtimes](screenshots/admin-showtimes.png) | ![Admin Halls](screenshots/admin-halls.png) |

| Bookings Management | Seat Management |
|--------------------|-----------------|
| ![Admin Bookings](screenshots/admin-bookings.png) | ![Admin Seats](screenshots/admin-seats.png) |

| Snacks Management | Book for User |
|-------------------|--------------|
| ![Admin Snacks](screenshots/admin-snacks.png) | ![Book for User](screenshots/admin-book-for-user.png) |

| Users Management | Waitlist |
|-----------------|----------|
| ![Admin Users](screenshots/admin-users.png) | ![Admin Waitlist](screenshots/admin-waitlist.png) |

## Project Structure

```
├── backend/
│   ├── server.js            # Express entry point + DB migrations
│   ├── database.js          # PostgreSQL connection pool
│   ├── routes/
│   │   ├── auth.js          # Login, register, forgot/reset password
│   │   ├── movies.js        # CRUD + reviews
│   │   ├── showtimes.js     # CRUD + recurring creation
│   │   ├── bookings.js      # Book, cancel, my bookings
│   │   ├── seats.js         # Seat availability per showtime
│   │   ├── snacks.js        # CRUD
│   │   ├── halls.js         # CRUD
│   │   ├── users.js         # Admin user management
│   │   └── waitlist.js      # Join/leave waitlist
│   └── utils/
│       └── email.js         # Booking confirmation + reminder emails
├── frontend/
│   ├── src/
│   │   ├── pages/           # All route pages
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # Auth + Booking context providers
│   │   └── utils/           # Shared utilities (genre colors, etc.)
│   └── vite.config.js       # Dev proxy → backend
└── start.bat                # One-click local launcher
```

## Local Development

```bash
# Terminal 1 — Backend
cd backend
npm install
npm start          # runs on port 5000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev        # runs on port 5173, proxies /api → backend
```

Or just double-click `start.bat` to launch both.

### Environment Variables (backend/.env)

```
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secret_key
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
FRONTEND_URL=https://your-deployment-url.vercel.app
DISPLAY_TIMEZONE=Asia/Dubai
```

## Database Schema

PostgreSQL with 10 tables: `users`, `movies`, `halls`, `seats`, `showtimes`, `snacks`, `bookings`, `booking_seats`, `booking_snacks`, `waitlist`, `reviews`, `password_reset_tokens`.

All migrations run automatically on server startup via `CREATE TABLE IF NOT EXISTS`.
