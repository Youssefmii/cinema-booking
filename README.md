# Cinema Booking System

## Quick Start

### Option 1 — Double-click `start.bat`
Starts both backend and frontend automatically.

### Option 2 — Manual
```bash
# Terminal 1 — Backend
cd backend
npm start

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

## Features
- Browse movies with poster, genre, duration
- Select showtimes by date
- Visual seat grid: VIP (row A), Couple (last 2 seats), Standard
- Add snacks (food, drinks, candy)
- Booking summary & simulated payment
- Email confirmation via Nodemailer
- Admin panel: movies, showtimes, halls, snacks, bookings

## Email Setup (optional)
Edit `backend/.env` and set your Gmail credentials:
```
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password
```
> Use a Gmail App Password (not your regular password).
> If not configured, bookings still work — the email just silently fails.
