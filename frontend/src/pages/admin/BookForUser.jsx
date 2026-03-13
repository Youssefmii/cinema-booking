import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { UserCheck, Search, CheckCircle2 } from 'lucide-react';

const SEAT_COLORS = {
  standard: { available: 'bg-slate-100 border-slate-300 text-slate-200 hover:bg-blue-100 hover:border-blue-400', selected: 'bg-blue-600 border-blue-600 text-white', booked: 'bg-slate-200 border-white/15 text-slate-400 cursor-not-allowed' },
  vip:      { available: 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-200', selected: 'bg-amber-500 border-amber-500 text-white', booked: 'bg-slate-200 border-white/15 text-slate-400 cursor-not-allowed' },
  couple:   { available: 'bg-pink-50 border-pink-300 text-pink-700 hover:bg-pink-200', selected: 'bg-pink-500 border-pink-500 text-white', booked: 'bg-slate-200 border-white/15 text-slate-400 cursor-not-allowed' },
};

export default function BookForUser() {
  const location = useLocation();
  const preselected = location.state?.preselectedUser || null;

  const [email, setEmail]           = useState(preselected?.email || '');
  const [resolvedUser, setResolvedUser] = useState(preselected || null);
  const [lookingUp, setLookingUp]   = useState(false);

  const [showtimes, setShowtimes]   = useState([]);
  const [showtimeId, setShowtimeId] = useState('');
  const [showtime, setShowtime]     = useState(null);

  const [seats, setSeats]           = useState([]);
  const [selected, setSelected]     = useState([]);

  const [booking, setBooking]       = useState(null); // success result
  const [submitting, setSubmitting] = useState(false);

  // Load all showtimes once
  useEffect(() => {
    api.get('/showtimes/all').then(r => setShowtimes(r.data));
  }, []);

  // Load seats when showtime changes
  useEffect(() => {
    if (!showtimeId) { setSeats([]); setSelected([]); setShowtime(null); return; }
    const st = showtimes.find(s => String(s.id) === showtimeId);
    setShowtime(st || null);
    setSelected([]);
    api.get(`/seats/showtime/${showtimeId}`).then(r => setSeats(r.data));
  }, [showtimeId, showtimes]);

  const lookupUser = async () => {
    if (!email.trim()) return;
    setLookingUp(true);
    setResolvedUser(null);
    try {
      const res = await api.get(`/users/lookup?email=${encodeURIComponent(email.trim())}`);
      setResolvedUser(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'User not found');
    } finally {
      setLookingUp(false);
    }
  };

  const toggleSeat = (seat) => {
    if (seat.is_booked) return;
    setSelected(prev =>
      prev.some(s => s.id === seat.id)
        ? prev.filter(s => s.id !== seat.id)
        : [...prev, seat]
    );
  };

  const seatPrice = (seat) => {
    if (!showtime) return 0;
    if (seat.seat_type === 'vip') return showtime.price_vip;
    if (seat.seat_type === 'couple') return showtime.price_couple;
    return showtime.price_standard;
  };

  const total = selected.reduce((sum, s) => sum + seatPrice(s), 0);

  const handleBook = async () => {
    if (!resolvedUser) return toast.error('Look up a user first');
    if (!showtimeId)   return toast.error('Select a showtime');
    if (!selected.length) return toast.error('Select at least one seat');

    setSubmitting(true);
    try {
      const res = await api.post('/bookings/admin/book', {
        user_email: resolvedUser.email,
        showtime_id: Number(showtimeId),
        seat_ids: selected.map(s => s.id),
      });
      setBooking(res.data);
      toast.success('Booking created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setEmail(''); setResolvedUser(null);
    setShowtimeId(''); setShowtime(null);
    setSeats([]); setSelected([]);
    setBooking(null);
  };

  // Group seats by row
  const rows = seats.reduce((acc, seat) => {
    if (!acc[seat.row_label]) acc[seat.row_label] = [];
    acc[seat.row_label].push(seat);
    return acc;
  }, {});

  if (booking) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white/10 rounded-2xl border border-white/15 p-10 text-center max-w-md w-full shadow-sm">
          <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-1">Booking Created!</h2>
          <p className="text-slate-500 mb-6">Confirmation email sent to <strong>{resolvedUser?.email}</strong></p>
          <div className="bg-white/5 rounded-xl p-4 text-left space-y-2 mb-6 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Reference</span><span className="font-mono font-semibold">{booking.reference}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">User</span><span className="font-semibold">{booking.user_name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-bold text-blue-600">${booking.total.toFixed(2)}</span></div>
          </div>
          <button onClick={reset} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700">
            Book Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <UserCheck size={24} className="text-blue-600" /> Book for User
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* User email lookup */}
        <div className="bg-white/10 rounded-xl border border-white/15 p-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">User Email</label>
          <div className="flex gap-2">
            <input
              value={email}
              onChange={e => { setEmail(e.target.value); setResolvedUser(null); }}
              onKeyDown={e => e.key === 'Enter' && lookupUser()}
              placeholder="user@example.com"
              className="flex-1 px-3 py-2.5 rounded-xl border border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={lookupUser}
              disabled={lookingUp || !email.trim()}
              className="px-3 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              <Search size={16} />
            </button>
          </div>
          {resolvedUser && (
            <div className="mt-2.5 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
              <CheckCircle2 size={15} className="text-green-600 flex-shrink-0" />
              <span className="font-semibold text-green-800">{resolvedUser.name}</span>
              <span className="text-green-600 text-xs ml-auto">{resolvedUser.email}</span>
            </div>
          )}
        </div>

        {/* Showtime picker */}
        <div className="bg-white/10 rounded-xl border border-white/15 p-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Showtime</label>
          <select
            value={showtimeId}
            onChange={e => setShowtimeId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a showtime...</option>
            {showtimes.map(s => (
              <option key={s.id} value={s.id}>
                {s.movie_title} — {format(new Date(s.datetime), 'MMM d, h:mm a')} ({s.hall_name})
              </option>
            ))}
          </select>
          {showtime && (
            <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-slate-500">
              <span>Standard <strong className="text-slate-200">${showtime.price_standard}</strong></span>
              <span>VIP <strong className="text-slate-200">${showtime.price_vip}</strong></span>
              <span>Couple <strong className="text-slate-200">${showtime.price_couple}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Seat grid */}
      {seats.length > 0 && (
        <div className="bg-white/10 rounded-xl border border-white/15 p-6 mb-6">
          {/* Screen */}
          <div className="text-center mb-8">
            <div className="inline-block w-2/3 h-3 bg-gradient-to-b from-blue-200 to-blue-100 rounded-t-full"></div>
            <p className="text-xs text-slate-400 mt-1 tracking-widest uppercase">Screen</p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mb-6 text-xs">
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border bg-slate-100 border-slate-300 inline-block"></span> Standard</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border bg-amber-50 border-amber-300 inline-block"></span> VIP</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border bg-pink-50 border-pink-300 inline-block"></span> Couple</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border bg-blue-600 inline-block"></span> Selected</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border bg-slate-200 inline-block"></span> Booked</span>
          </div>

          {/* Grid */}
          <div className="overflow-x-auto flex justify-center">
            <div className="min-w-max">
              {Object.entries(rows).map(([rowLabel, rowSeats]) => (
                <div key={rowLabel} className="flex items-center gap-1 mb-1">
                  <span className="w-6 text-xs text-slate-400 font-medium text-right mr-1">{rowLabel}</span>
                  {rowSeats.map(seat => {
                    const isSelected = selected.some(s => s.id === seat.id);
                    const colors = SEAT_COLORS[seat.seat_type] || SEAT_COLORS.standard;
                    const cls = seat.is_booked ? colors.booked : isSelected ? colors.selected : colors.available;
                    return (
                      <button
                        key={seat.id}
                        disabled={seat.is_booked}
                        onClick={() => toggleSeat(seat)}
                        title={`${rowLabel}${seat.seat_number} — ${seat.seat_type} — $${seatPrice(seat)}`}
                        className={`w-8 h-8 text-xs font-medium rounded border ${cls} flex items-center justify-center`}
                      >
                        {seat.seat_number}
                      </button>
                    );
                  })}
                  <span className="w-6 text-xs text-slate-400 font-medium ml-1">{rowLabel}</span>
                </div>
              ))}
              <div className="flex items-center gap-1 mt-1 ml-7">
                {Object.values(rows)[0]?.map(s => (
                  <span key={s.id} className="w-8 text-xs text-slate-300 text-center">{s.seat_number}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary + Book button */}
      {selected.length > 0 && (
        <div className="bg-white/10 rounded-xl border border-white/15 p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Selected Seats</p>
            <div className="flex flex-wrap gap-1.5">
              {selected.map(s => (
                <span key={s.id} className="text-xs bg-blue-500/10 text-blue-700 border border-blue-200 rounded px-2 py-0.5 font-mono">
                  {s.row_label}{s.seat_number} ({s.seat_type})
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-400">Total</p>
              <p className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</p>
            </div>
            <button
              onClick={handleBook}
              disabled={submitting || !resolvedUser || !showtimeId}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
            >
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}

      {!showtimeId && (
        <div className="text-center py-16 text-slate-400 bg-white/10 rounded-xl border border-white/15">
          <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
          <p>Enter a user email and select a showtime to begin</p>
        </div>
      )}
    </div>
  );
}
