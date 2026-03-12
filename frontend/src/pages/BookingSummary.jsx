import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Film, Clock, MapPin, Armchair, ShoppingBag, CreditCard } from 'lucide-react';

export default function BookingSummary() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const { bookingData, total } = useBooking();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const st = bookingData.showtime;
  if (!st || bookingData.selectedSeats.length === 0) {
    navigate(`/booking/${showtimeId}/seats`);
    return null;
  }

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await api.post('/bookings', {
        showtime_id: st.id,
        seat_ids: bookingData.selectedSeats.map(s => s.id),
        snacks: bookingData.selectedSnacks.map(s => ({ snack_id: s.id, quantity: s.quantity })),
      });
      navigate(`/booking/confirmation/${res.data.reference}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const seatTotal = bookingData.selectedSeats.reduce((sum, s) => {
    if (s.seat_type === 'vip') return sum + st.price_vip;
    if (s.seat_type === 'couple') return sum + st.price_couple;
    return sum + st.price_standard;
  }, 0);
  const snackTotal = bookingData.selectedSnacks.reduce((sum, s) => sum + s.price * s.quantity, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Booking Summary</h1>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
        {/* Movie */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold mb-2"><Film size={16}/> Movie</div>
          <div className="font-bold text-slate-800 text-lg">{st.movie_title}</div>
          <div className="flex gap-4 text-sm text-slate-500 mt-1">
            <span className="flex items-center gap-1"><Clock size={13}/>{format(new Date(st.datetime), 'EEE, MMM d · h:mm a')}</span>
            <span className="flex items-center gap-1"><MapPin size={13}/>{st.hall_name}</span>
          </div>
        </div>

        {/* Seats */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold mb-3"><Armchair size={16}/> Seats</div>
          <div className="space-y-1">
            {bookingData.selectedSeats.map(s => {
              const price = s.seat_type === 'vip' ? st.price_vip : s.seat_type === 'couple' ? st.price_couple : st.price_standard;
              return (
                <div key={s.id} className="flex justify-between text-sm">
                  <span className="text-slate-700">{s.row_label}{s.seat_number} <span className="capitalize text-slate-400">({s.seat_type})</span></span>
                  <span className="font-medium text-slate-800">${price.toFixed(2)}</span>
                </div>
              );
            })}
            <div className="flex justify-between text-sm font-semibold pt-1 border-t border-slate-100 mt-1">
              <span>Seats subtotal</span><span>${seatTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Snacks */}
        {bookingData.selectedSnacks.length > 0 && (
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold mb-3"><ShoppingBag size={16}/> Snacks</div>
            <div className="space-y-1">
              {bookingData.selectedSnacks.map(s => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span className="text-slate-700">{s.name} <span className="text-slate-400">×{s.quantity}</span></span>
                  <span className="font-medium text-slate-800">${(s.price * s.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold pt-1 border-t border-slate-100 mt-1">
                <span>Snacks subtotal</span><span>${snackTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="p-5 bg-slate-50">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-slate-800">Total</span>
            <span className="text-2xl font-bold text-blue-600">${total().toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Booking for: {user?.name} ({user?.email})</p>
        </div>
      </div>

      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
      >
        <CreditCard size={20} />
        {loading ? 'Processing...' : `Confirm & Pay $${total().toFixed(2)}`}
      </button>
      <p className="text-center text-xs text-slate-400 mt-2">This is a simulated payment — no real charge will be made</p>
    </div>
  );
}
