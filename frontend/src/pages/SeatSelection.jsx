import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import SeatGrid from '../components/SeatGrid';
import LoadingSpinner from '../components/LoadingSpinner';
import { useBooking } from '../context/BookingContext';
import { format } from 'date-fns';
import { ChevronRight, MapPin, Clock, BellRing, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function SeatSelection() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const { isBlacklisted } = useAuth();
  const { bookingData, setShowtime } = useBooking();
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [waitlistEntry, setWaitlistEntry] = useState(null);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  useEffect(() => {
    if (isBlacklisted) {
      toast.error('Your account is restricted. Please contact staff to book.');
      navigate('/');
      return;
    }
    const loadData = async () => {
      try {
        const [stRes, sRes] = await Promise.all([
          api.get(`/showtimes/${showtimeId}`),
          api.get(`/seats/showtime/${showtimeId}`),
        ]);
        if (!bookingData.showtime || bookingData.showtime.id !== stRes.data.id) {
          setShowtime(stRes.data);
        }
        setSeats(sRes.data);
        // Check waitlist separately so errors don't break seat loading
        try {
          const wRes = await api.get(`/waitlist/check/${showtimeId}`);
          if (wRes.data.onWaitlist) setWaitlistEntry(wRes.data.entry);
        } catch (e) {
          // Waitlist check failed — user can still join later
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [showtimeId, isBlacklisted]);

  const st = bookingData.showtime;
  const selected = bookingData.selectedSeats;
  const availableSeats = seats.filter(s => !s.is_booked);
  const isFullyBooked = seats.length > 0 && availableSeats.length === 0;

  const handleJoinWaitlist = async () => {
    setWaitlistLoading(true);
    try {
      await api.post('/waitlist', { showtime_id: parseInt(showtimeId) });
      const wRes = await api.get(`/waitlist/check/${showtimeId}`);
      setWaitlistEntry(wRes.data.entry);
      toast.success('Added to waitlist! We will email you when a seat becomes available.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not join waitlist');
    } finally {
      setWaitlistLoading(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    if (!waitlistEntry) return;
    setWaitlistLoading(true);
    try {
      await api.delete(`/waitlist/${waitlistEntry.id}`);
      setWaitlistEntry(null);
      toast.success('Removed from waitlist.');
    } catch (err) {
      toast.error('Could not leave waitlist');
    } finally {
      setWaitlistLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {st && (
        <div className="bg-white/10 rounded-xl border border-white/15 p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{st.movie_title}</h1>
            <div className="flex gap-4 text-sm text-slate-400 mt-1">
              <span className="flex items-center gap-1"><Clock size={14} /> {format(new Date(st.datetime), 'EEE, MMM d · h:mm a')}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {st.hall_name}</span>
            </div>
          </div>
          <div className="text-right">
            {isFullyBooked ? (
              <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold px-3 py-1 rounded-full">SOLD OUT</span>
            ) : (
              <div className="text-sm text-slate-400">{selected.length} seat{selected.length !== 1 ? 's' : ''} selected</div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white/10 rounded-xl border border-white/15 p-6 mb-6">
        <SeatGrid seats={seats} />
      </div>

      {isFullyBooked && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-center">
          <h2 className="text-lg font-bold text-red-300 mb-1">This show is sold out</h2>
          <p className="text-slate-400 text-sm">All seats are booked for this showtime.</p>
        </div>
      )}

      {!isFullyBooked && (
        <>
          {selected.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-blue-300 mb-2">Selected Seats</h3>
              <div className="flex flex-wrap gap-2">
                {selected.map(s => (
                  <span key={s.id} className="bg-blue-500/20 border border-blue-500/30 text-blue-200 text-sm px-3 py-1 rounded-full font-medium">
                    {s.row_label}{s.seat_number} <span className="text-blue-400 capitalize">({s.seat_type})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          <button
            disabled={selected.length === 0}
            onClick={() => navigate(`/booking/${showtimeId}/snacks`)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Continue to Snacks <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Waitlist section — always visible */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mt-6">
        <div className="flex items-center gap-3 mb-2">
          <BellRing size={22} className="text-amber-500" />
          <h3 className="font-bold text-white">Waitlist</h3>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          {isFullyBooked
            ? 'Join the waitlist and we will email you instantly when a seat becomes available.'
            : 'Want to be notified if better seats open up? Join the waitlist for this showtime.'}
        </p>
        {waitlistEntry ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
              <BellRing size={16} /> You are on the waitlist
            </div>
            <button
              onClick={handleLeaveWaitlist}
              disabled={waitlistLoading}
              className="flex items-center gap-2 px-4 py-2 border border-red-500/40 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <BellOff size={14} /> Leave
            </button>
          </div>
        ) : (
          <button
            onClick={handleJoinWaitlist}
            disabled={waitlistLoading}
            className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <BellRing size={16} /> {waitlistLoading ? 'Joining...' : 'Join Waitlist'}
          </button>
        )}
      </div>
    </div>
  );
}
