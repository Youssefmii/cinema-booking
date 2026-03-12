import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';
import { ArrowLeft, RefreshCw, MapPin, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = {
  standard: {
    available: 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-blue-100 hover:border-blue-400',
    selected:  'bg-blue-600 border-blue-600 text-white',
    current:   'bg-teal-100 border-teal-400 text-teal-700',
    booked:    'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed',
  },
  vip: {
    available: 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-200',
    selected:  'bg-amber-500 border-amber-500 text-white',
    current:   'bg-teal-100 border-teal-400 text-teal-700',
    booked:    'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed',
  },
  couple: {
    available: 'bg-pink-50 border-pink-300 text-pink-700 hover:bg-pink-200',
    selected:  'bg-pink-500 border-pink-500 text-white',
    current:   'bg-teal-100 border-teal-400 text-teal-700',
    booked:    'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed',
  },
};

export default function ModifySeats() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const bRes = await api.get(`/bookings/ref/${null}`); // placeholder; we'll use my endpoint
        // Get booking from /bookings/my
        const myRes = await api.get('/bookings/my');
        const b = myRes.data.find(x => String(x.id) === String(bookingId));
        if (!b) { toast.error('Booking not found'); navigate('/profile'); return; }
        setBooking(b);

        const sRes = await api.get(`/seats/showtime/${b.showtime_id}`);
        setSeats(sRes.data);
        // Pre-select current seats
        setSelected(b.seats || []);
      } catch {
        toast.error('Failed to load');
        navigate('/profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

  const currentSeatIds = new Set(booking?.seats?.map(s => s.id) || []);

  const toggle = seat => {
    if (seat.is_booked && !currentSeatIds.has(seat.id)) return;
    setSelected(prev =>
      prev.some(s => s.id === seat.id)
        ? prev.filter(s => s.id !== seat.id)
        : [...prev, seat]
    );
  };

  const calcTotal = () => {
    if (!booking) return 0;
    const seatTotal = selected.reduce((sum, s) => {
      if (s.seat_type === 'vip') return sum + (booking.price_vip || 22);
      if (s.seat_type === 'couple') return sum + (booking.price_couple || 35);
      return sum + (booking.price_standard || 12);
    }, 0);
    const snackTotal = (booking.snacks || []).reduce((sum, s) => sum + s.price * s.quantity, 0);
    return seatTotal + snackTotal;
  };

  const handleSubmit = async () => {
    if (!selected.length) { toast.error('Please select at least one seat'); return; }
    setSubmitting(true);
    try {
      await api.patch(`/bookings/${bookingId}/modify-seats`, { new_seat_ids: selected.map(s => s.id) });
      toast.success('Seats updated successfully!');
      navigate('/profile');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update seats');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!booking) return null;

  // Group seats by row
  const rows = {};
  seats.forEach(seat => {
    if (!rows[seat.row_label]) rows[seat.row_label] = [];
    rows[seat.row_label].push(seat);
  });

  const newTotal = calcTotal();
  const unchanged = booking.seats?.length === selected.length &&
    booking.seats?.every(s => selected.some(x => x.id === s.id));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm">
        <ArrowLeft size={16}/> Back to profile
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <h1 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
          <RefreshCw size={18} className="text-blue-600"/> Modify Seats
        </h1>
        <p className="text-slate-500 text-sm mb-3">{booking.movie_title}</p>
        <div className="flex gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1"><Clock size={13}/>{format(new Date(booking.datetime), 'MMM d, h:mm a')}</span>
          <span className="flex items-center gap-1"><MapPin size={13}/>{booking.hall_name}</span>
          <span className="font-mono text-xs text-slate-400">{booking.reference_number}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mb-5 text-xs">
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border bg-slate-100 border-slate-300 inline-block"></span> Available</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border bg-teal-100 border-teal-400 inline-block"></span> Your current seats</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border bg-blue-600 border-blue-600 inline-block"></span> Selected</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded border bg-slate-200 border-slate-200 inline-block"></span> Booked by others</span>
      </div>

      {/* Seat grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <div className="mb-6 text-center">
          <div className="inline-block w-3/4 h-3 bg-gradient-to-b from-blue-200 to-blue-100 rounded-t-full"></div>
          <p className="text-xs text-slate-400 mt-1 tracking-widest uppercase">Screen</p>
        </div>
        <div className="overflow-x-auto flex justify-center">
          <div className="min-w-max">
            {Object.entries(rows).map(([rowLabel, rowSeats]) => (
              <div key={rowLabel} className="flex items-center gap-1 mb-1">
                <span className="w-6 text-xs text-slate-400 font-medium text-right mr-1">{rowLabel}</span>
                {rowSeats.map(seat => {
                  const isSelected = selected.some(s => s.id === seat.id);
                  const isCurrent = currentSeatIds.has(seat.id);
                  const isBookedByOthers = seat.is_booked && !isCurrent;
                  const colors = COLORS[seat.seat_type] || COLORS.standard;
                  let cls;
                  if (isBookedByOthers) cls = colors.booked;
                  else if (isSelected) cls = colors.selected;
                  else if (isCurrent) cls = colors.current;
                  else cls = colors.available;

                  return (
                    <button
                      key={seat.id}
                      disabled={isBookedByOthers}
                      onClick={() => toggle(seat)}
                      title={`${rowLabel}${seat.seat_number} — ${seat.seat_type}`}
                      className={`w-8 h-8 text-xs font-medium rounded border ${cls} flex items-center justify-center`}
                    >
                      {seat.seat_number}
                    </button>
                  );
                })}
                <span className="w-6 text-xs text-slate-400 font-medium ml-1">{rowLabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary & submit */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{selected.length} seat{selected.length !== 1 ? 's' : ''} selected</p>
          <p className="font-bold text-blue-600 text-xl">${newTotal.toFixed(2)}</p>
          {booking.snacks?.length > 0 && (
            <p className="text-xs text-slate-400">Includes snacks</p>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || unchanged || !selected.length}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : unchanged ? 'No changes' : 'Confirm Changes'}
        </button>
      </div>
    </div>
  );
}
