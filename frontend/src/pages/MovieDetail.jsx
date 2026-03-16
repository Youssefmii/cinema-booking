import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { Clock, Tag, Calendar, MapPin, ChevronRight, ShieldBan, X, Star, MessageSquare, Trash2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import StarRating, { Stars } from '../components/StarRating';

function BlacklistModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-red-700 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <ShieldBan size={24}/>
            <h2 className="text-lg font-bold">Account Restricted</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={20}/>
          </button>
        </div>
        <div className="px-6 py-6 space-y-4">
          <p className="text-slate-700">
            Your account has been <strong>restricted</strong> due to a late cancellation (within 2 hours of showtime).
          </p>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <p className="font-semibold mb-1">You cannot book tickets directly.</p>
            <p>Please visit the cinema in person or contact our staff — they can book on your behalf and lift the restriction.</p>
          </div>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isBlacklisted, isAdmin } = useAuth();
  const { setShowtime } = useBooking();
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  const refreshReviews = async () => {
    const rRes = await api.get(`/movies/${id}/reviews`);
    setReviews(rRes.data.reviews);
    setAvgRating(rRes.data.avgRating);
    return rRes.data.reviews;
  };

  useEffect(() => {
    Promise.all([
      api.get(`/movies/${id}`),
      api.get(`/showtimes?movie_id=${id}`),
      api.get(`/movies/${id}/reviews`),
    ]).then(([mRes, sRes, rRes]) => {
      setMovie(mRes.data);
      setShowtimes(sRes.data);
      setReviews(rRes.data.reviews);
      setAvgRating(rRes.data.avgRating);
    }).finally(() => setLoading(false));

    // Check if user has a booking for this movie (only booked users can review)
    if (user) {
      api.get('/bookings/my').then(r => {
        const hasBooking = r.data.some(b => String(b.movie_id) === String(id) && b.status === 'confirmed');
        setCanReview(hasBooking);
      }).catch(() => setCanReview(false));
    }
  }, [id, user?.id]);

  // When reviews load, pre-fill form if user already has a review
  useEffect(() => {
    if (user && reviews.length) {
      const mine = reviews.find(r => r.user_id === user.id);
      if (mine) setReviewForm({ rating: mine.rating, comment: mine.comment || '' });
    }
  }, [reviews, user?.id]);

  const userReview = reviews.find(r => r.user_id === user?.id);

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Delete this review?')) return;
    try {
      await api.delete(`/movies/${id}/reviews/${reviewId}`);
      toast.success('Review deleted');
      await refreshReviews();
    } catch {
      toast.error('Could not delete review');
    }
  };

  const handleReviewSubmit = async e => {
    e.preventDefault();
    if (!reviewForm.rating) { toast.error('Please select a star rating'); return; }
    setSubmittingReview(true);
    try {
      const res = await api.post(`/movies/${id}/reviews`, reviewForm);
      toast.success(res.data.message === 'Review updated' ? 'Review updated!' : 'Review submitted!');
      setEditingReview(false);
      setCanReview(false);
      await refreshReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSelect = (showtime) => {
    if (!user) { toast.error('Please login to book tickets'); navigate('/login'); return; }
    if (isBlacklisted) { setShowBlacklistModal(true); return; }
    setShowtime(showtime);
    navigate(`/booking/${showtime.id}/seats`);
  };

  if (loading) return <LoadingSpinner />;
  if (!movie) return <div className="text-center py-20 text-slate-300">Movie not found</div>;

  const fallback = `https://placehold.co/300x450/1e3a5f/white?text=${encodeURIComponent(movie.title)}`;

  // Group showtimes by date (use YYYY-MM-DD as key for reliable comparison)
  const grouped = showtimes.reduce((acc, st) => {
    const dateKey = format(new Date(st.datetime), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(st);
    return acc;
  }, {});

  const availableDates = Object.keys(grouped).sort();

  // Auto-select earliest date on first load
  const activeDateKey = selectedDate && grouped[selectedDate] ? selectedDate : availableDates[0];
  const activeShowtimes = activeDateKey ? grouped[activeDateKey] : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {showBlacklistModal && <BlacklistModal onClose={() => setShowBlacklistModal(false)} />}

      {/* Blacklist banner */}
      {user && isBlacklisted && (
        <div className="mb-6 bg-red-900/60 border border-red-500/50 rounded-xl p-4 flex gap-3 items-start">
          <ShieldBan size={20} className="text-red-400 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold text-red-300 text-sm">Account Restricted — Booking Disabled</p>
            <p className="text-red-400 text-sm mt-0.5">
              You cannot book tickets directly. Please visit the cinema or contact staff to book on your behalf.
            </p>
          </div>
        </div>
      )}

      {/* Movie Info */}
      <div className="flex flex-col md:flex-row gap-8 mb-10">
        <div className="flex-shrink-0">
          <img
            src={movie.poster_url || fallback}
            alt={movie.title}
            onError={e => { e.target.src = fallback; }}
            className="w-48 md:w-56 rounded-xl shadow-lg object-cover aspect-[2/3] mx-auto md:mx-0"
          />
        </div>
        <div className="flex-1">
          <span className="inline-block bg-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full mb-3 border border-blue-500/30">{movie.genre}</span>
          <h1 className="text-3xl font-bold text-white mb-3">{movie.title}</h1>
          <div className="flex flex-wrap gap-4 text-slate-400 text-sm mb-4">
            <span className="flex items-center gap-1"><Clock size={16} /> {movie.duration} minutes</span>
            <span className="flex items-center gap-1"><Tag size={16} /> {movie.genre}</span>
          </div>
          <p className="text-slate-300 leading-relaxed">{movie.description}</p>
        </div>
      </div>

      {/* Rating summary */}
      {avgRating && (
        <div className="flex items-center gap-3 mb-8 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 w-fit">
          <Stars rating={avgRating} size={18}/>
          <span className="font-bold text-amber-400 text-lg">{avgRating}</span>
          <span className="text-slate-400 text-sm">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
        </div>
      )}

      {/* Showtimes */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar size={20} className="text-blue-400" /> Available Showtimes
          </h2>

          {/* Date picker dropdown */}
          {availableDates.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                className="flex items-center gap-2 bg-white/10 border border-white/20 hover:border-blue-400 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all min-w-[200px] justify-between"
              >
                <span className="flex items-center gap-2">
                  <Calendar size={15} className="text-blue-400" />
                  {activeDateKey ? format(new Date(activeDateKey + 'T00:00:00'), 'EEEE, MMM d') : 'Select Date'}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${dateDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dateDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDateDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 bg-slate-800 border border-white/20 rounded-xl shadow-xl z-50 min-w-[220px] py-1 max-h-72 overflow-y-auto">
                    {availableDates.map(dateKey => {
                      const isActive = dateKey === activeDateKey;
                      const count = grouped[dateKey].length;
                      return (
                        <button
                          key={dateKey}
                          onClick={() => { setSelectedDate(dateKey); setDateDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                            isActive
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'text-slate-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="font-medium">{format(new Date(dateKey + 'T00:00:00'), 'EEE, MMM d')}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-500/30 text-blue-300' : 'bg-white/10 text-slate-400'}`}>
                            {count} show{count !== 1 ? 's' : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {availableDates.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white/5 rounded-xl">No showtimes available</div>
        ) : (
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              {activeDateKey && format(new Date(activeDateKey + 'T00:00:00'), 'EEEE, MMMM d')}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {activeShowtimes.map(st => (
                <button
                  key={st.id}
                  onClick={() => handleSelect(st)}
                  className={`flex items-center justify-between bg-white/10 border rounded-xl p-4 transition-all text-left group ${
                    isBlacklisted
                      ? 'border-white/10 opacity-60 cursor-not-allowed'
                      : 'border-white/15 hover:border-blue-400 hover:bg-white/15 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white text-lg">{format(new Date(st.datetime), 'h:mm a')}</div>
                    <div className="flex items-center gap-1 text-slate-400 text-sm mt-0.5">
                      <MapPin size={13} /> {st.hall_name}
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-slate-400">
                      <span>Standard <strong className="text-slate-200">${st.price_standard}</strong></span>
                      <span>VIP <strong className="text-amber-400">${st.price_vip}</strong></span>
                      <span>Couple <strong className="text-pink-400">${st.price_couple}</strong></span>
                    </div>
                  </div>
                  {isBlacklisted
                    ? <ShieldBan size={18} className="text-red-400 flex-shrink-0"/>
                    : <ChevronRight size={20} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                  }
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
          <MessageSquare size={20} className="text-blue-400" /> Reviews
        </h2>

        {/* Write / Edit review form */}
        {user && ((canReview && !userReview) || editingReview) && (
          <form onSubmit={handleReviewSubmit} className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 mb-6 space-y-3">
            <p className="font-semibold text-slate-200 text-sm">
              {editingReview ? 'Edit your review' : 'Share your experience'}
            </p>
            <StarRating value={reviewForm.rating} onChange={r => setReviewForm(f => ({ ...f, rating: r }))} />
            <textarea
              value={reviewForm.comment}
              onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
              placeholder="Write your review (optional)..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-200 placeholder-slate-500 text-sm resize-none"
            />
            <div className="flex gap-2">
              <button
                type="submit" disabled={submittingReview}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {submittingReview ? 'Saving…' : editingReview ? 'Save Changes' : 'Submit Review'}
              </button>
              {editingReview && (
                <button
                  type="button"
                  onClick={() => { setEditingReview(false); setReviewForm({ rating: userReview.rating, comment: userReview.comment || '' }); }}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 border border-white/20 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {reviews.length === 0 ? (
          <div className="text-center py-10 text-slate-400 bg-white/5 rounded-xl">
            <Star size={32} className="mx-auto mb-2 opacity-30"/>
            <p>No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(r => (
              <div key={r.id} className={`bg-white/10 border rounded-xl p-4 ${r.user_id === user?.id ? 'border-blue-500/40' : 'border-white/15'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center font-bold text-sm">
                      {r.user_name?.[0]?.toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-200 text-sm">{r.user_name}</span>
                    {r.user_id === user?.id && (
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">You</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Stars rating={r.rating} size={14}/>
                    <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
                    {r.user_id === user?.id && !editingReview && (
                      <button
                        onClick={() => { setEditingReview(true); setReviewForm({ rating: r.rating, comment: r.comment || '' }); }}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium ml-1"
                      >
                        Edit
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteReview(r.id)}
                        className="ml-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete review"
                      >
                        <Trash2 size={13}/>
                      </button>
                    )}
                  </div>
                </div>
                {r.comment && <p className="text-slate-300 text-sm leading-relaxed mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
