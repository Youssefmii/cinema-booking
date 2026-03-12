import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';
import { CheckCircle, Film, Clock, MapPin, Ticket, Home } from 'lucide-react';
import { useBooking } from '../context/BookingContext';

export default function BookingConfirmation() {
  const { reference } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const { clearBooking } = useBooking();

  useEffect(() => {
    clearBooking();
    api.get(`/bookings/ref/${reference}`).then(r => setBooking(r.data)).finally(() => setLoading(false));
  }, [reference]);

  if (loading) return <LoadingSpinner />;
  if (!booking) return <div className="text-center py-20 text-slate-500">Booking not found</div>;

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <CheckCircle size={64} className="text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Booking Confirmed!</h1>
        <p className="text-slate-500">A confirmation email has been sent to your inbox.</p>
      </div>

      {/* Ticket card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg mb-6">
        {/* Reference banner */}
        <div className="bg-blue-600 text-white p-5 text-center">
          <p className="text-sm opacity-80 mb-1">Booking Reference</p>
          <p className="text-3xl font-bold tracking-widest">{booking.reference_number}</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Movie */}
          <div className="flex items-start gap-3">
            <Film size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Movie</p>
              <p className="font-bold text-slate-800">{booking.movie_title}</p>
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-start gap-3">
              <Clock size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Showtime</p>
                <p className="font-medium text-slate-800">{format(new Date(booking.datetime), 'EEE, MMM d')}</p>
                <p className="text-slate-600">{format(new Date(booking.datetime), 'h:mm a')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Hall</p>
                <p className="font-medium text-slate-800">{booking.hall_name}</p>
              </div>
            </div>
          </div>

          {/* Seats */}
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Seats</p>
            <div className="flex flex-wrap gap-2">
              {booking.seats.map(s => (
                <span key={s.id} className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-sm font-medium capitalize">
                  {s.row_label}{s.seat_number} ({s.seat_type})
                </span>
              ))}
            </div>
          </div>

          {/* Snacks */}
          {booking.snacks.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Snacks</p>
              <div className="space-y-1">
                {booking.snacks.map(s => (
                  <div key={s.id} className="flex justify-between text-sm text-slate-700">
                    <span>{s.name} ×{s.quantity}</span>
                    <span>${(s.price * s.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
            <span className="font-bold text-slate-800">Total Paid</span>
            <span className="text-xl font-bold text-blue-600">${booking.total_price.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Link to="/profile" className="flex-1 py-3 border border-blue-600 text-blue-600 rounded-xl font-semibold text-center flex items-center justify-center gap-2 hover:bg-blue-50">
          <Ticket size={18} /> My Bookings
        </Link>
        <Link to="/" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold text-center flex items-center justify-center gap-2 hover:bg-blue-700">
          <Home size={18} /> Back to Movies
        </Link>
      </div>
    </div>
  );
}
