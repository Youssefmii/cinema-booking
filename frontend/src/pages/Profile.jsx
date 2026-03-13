import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';
import { Ticket, Film, Clock, MapPin, ChevronDown, ChevronUp, XCircle, BadgeCheck, ShieldBan } from 'lucide-react';
import toast from 'react-hot-toast';

function BookingCard({ booking, onCancel }) {
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.patch(`/bookings/${booking.id}/cancel`);
      toast.success('Booking cancelled successfully');
      onCancel(booking.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel booking');
    } finally {
      setCancelling(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="bg-white/10 border border-white/15 rounded-xl overflow-hidden">
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/10" onClick={() => setOpen(!open)}>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-300'}`}>
              {booking.status}
            </span>
            <span className="text-xs text-slate-400 font-mono">{booking.reference_number}</span>
          </div>
          <h3 className="font-bold text-white">{booking.movie_title}</h3>
          <div className="flex gap-4 text-sm text-slate-500 mt-0.5">
            <span className="flex items-center gap-1"><Clock size={13}/>{format(new Date(booking.datetime), 'MMM d, h:mm a')}</span>
            <span className="flex items-center gap-1"><MapPin size={13}/>{booking.hall_name}</span>
          </div>
        </div>
        <div className="text-right ml-4">
          <div className="font-bold text-blue-600 text-lg">${booking.total_price.toFixed(2)}</div>
          {open ? <ChevronUp size={18} className="ml-auto text-slate-400 mt-1"/> : <ChevronDown size={18} className="ml-auto text-slate-400 mt-1"/>}
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 px-4 py-3 bg-white/5 space-y-3">
          {/* Seats */}
          {booking.seats && booking.seats.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Seats</p>
              <div className="flex flex-wrap gap-2">
                {booking.seats.map(seat => (
                  <span key={seat.id} className="text-xs bg-white/10 border border-white/15 rounded px-2 py-0.5 font-mono">
                    {seat.row_label}{seat.seat_number} <span className="text-slate-400">({seat.seat_type})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Snacks */}
          {booking.snacks && booking.snacks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Snacks</p>
              <div className="flex flex-wrap gap-2">
                {booking.snacks.map(snack => (
                  <span key={snack.id} className="text-xs bg-white/10 border border-white/15 rounded px-2 py-0.5">
                    {snack.name} ×{snack.quantity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {booking.status === 'confirmed' && new Date(booking.datetime) > new Date() && (
            <div className="pt-1 flex flex-wrap items-center gap-4">
              {/* Cancel */}
              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 font-medium"
                >
                  <XCircle size={15}/> Cancel Booking
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">Are you sure?</span>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="text-sm bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="text-sm text-slate-500 hover:text-slate-200"
                  >
                    Keep it
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBlacklisted, setIsBlacklisted] = useState(false);

  useEffect(() => {
    api.get('/users/me').then(res => setIsBlacklisted(!!res.data.is_blacklisted)).catch(() => {});
    api.get('/bookings/my')
      .then(res => setBookings(res.data))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = (id) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white/10 border border-white/15 rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">{user?.name}</h1>
          <p className="text-slate-500 text-sm truncate">{user?.email}</p>
        </div>
        {user?.customer_number && (
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-1 text-xs text-slate-400 mb-0.5 justify-end">
              <BadgeCheck size={13} className="text-blue-500"/> Customer ID
            </div>
            <span className="font-mono font-bold text-blue-600 text-base tracking-wide">
              {user.customer_number}
            </span>
          </div>
        )}
      </div>

      {isBlacklisted && (
        <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3 items-start">
          <ShieldBan size={20} className="text-red-400 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold text-red-300 text-sm">Account Restricted</p>
            <p className="text-red-400 text-sm mt-0.5">
              Your account has been restricted due to a late cancellation (within 2 hours of showtime).
              You cannot book directly — please visit the cinema or contact staff to book on your behalf.
            </p>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
        <Ticket size={18}/> My Bookings
      </h2>

      {bookings.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Film size={40} className="mx-auto mb-3 opacity-40"/>
          <p>No bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <BookingCard key={b.id} booking={b} onCancel={handleCancel} />
          ))}
        </div>
      )}
    </div>
  );
}
