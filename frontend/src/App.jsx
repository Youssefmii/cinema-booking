import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { BookingProvider } from './context/BookingContext';
import Navbar from './components/Navbar';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';

import Home from './pages/Home';
import MovieDetail from './pages/MovieDetail';
import SeatSelection from './pages/SeatSelection';
import SnackSelection from './pages/SnackSelection';
import BookingSummary from './pages/BookingSummary';
import BookingConfirmation from './pages/BookingConfirmation';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminMovies from './pages/admin/Movies';
import AdminShowtimes from './pages/admin/Showtimes';
import AdminHalls from './pages/admin/Halls';
import AdminSnacks from './pages/admin/Snacks';
import AdminBookings from './pages/admin/Bookings';
import AdminSeats from './pages/admin/Seats';
import BookForUser from './pages/admin/BookForUser';
import AdminUsers from './pages/admin/Users';
import AdminWaitlist from './pages/admin/Waitlist';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BookingProvider>

          {/* Animated background */}
          <div className="animated-bg">
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="orb orb-3" />
            <div className="orb orb-4" />
            <div className="orb orb-5" />
            <div className="orb orb-6" />
          </div>

          <div className="content-layer">
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          <Navbar />
          <div className="min-h-screen">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/movie/:id" element={<MovieDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected user routes */}
            <Route path="/booking/:showtimeId/seats" element={<ProtectedRoute><SeatSelection /></ProtectedRoute>} />
            <Route path="/booking/:showtimeId/snacks" element={<ProtectedRoute><SnackSelection /></ProtectedRoute>} />
            <Route path="/booking/:showtimeId/summary" element={<ProtectedRoute><BookingSummary /></ProtectedRoute>} />
            <Route path="/booking/confirmation/:reference" element={<ProtectedRoute><BookingConfirmation /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="movies" element={<AdminMovies />} />
              <Route path="showtimes" element={<AdminShowtimes />} />
              <Route path="halls" element={<AdminHalls />} />
              <Route path="snacks" element={<AdminSnacks />} />
              <Route path="seats" element={<AdminSeats />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="book-for-user" element={<BookForUser />} />
              <Route path="waitlist" element={<AdminWaitlist />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>
          </Routes>
          </div>
          </div>

        </BookingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
