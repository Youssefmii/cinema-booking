import { useEffect, useState } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';

function BookingRow({ booking, onCancel, onRemoveSeat }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setOpen(!open)}>
        <td className="px-4 py-3 font-mono text-xs text-slate-500">{booking.reference_number}</td>
        <td className="px-4 py-3 font-medium text-slate-800">{booking.movie_title}</td>
        <td className="px-4 py-3 text-slate-600">{booking.user_name}</td>
        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{format(new Date(booking.datetime), 'MMM d · h:mm a')}</td>
        <td className="px-4 py-3 text-slate-600">{booking.hall_name}</td>
        <td className="px-4 py-3 font-semibold text-blue-600">${booking.total_price.toFixed(2)}</td>
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{booking.status}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {booking.status === 'confirmed' && (
              <button onClick={e => { e.stopPropagation(); onCancel(booking.id); }}
                className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50">
                Cancel All
              </button>
            )}
            {open ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50 border-b border-slate-100">
          <td colSpan={8} className="px-6 py-3 text-sm">
            <div className="flex flex-wrap gap-6">
              <div>
                <span className="text-slate-400 font-medium">Seats: </span>
                <div className="inline-flex flex-wrap gap-1 mt-1">
                  {booking.seats.map(s => (
                    <span key={s.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs capitalize">
                      {s.row_label}{s.seat_number} ({s.seat_type})
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={e => { e.stopPropagation(); onRemoveSeat(booking.id, s.id, `${s.row_label}${s.seat_number}`); }}
                          className="ml-0.5 text-blue-400 hover:text-red-600 transition-colors"
                          title="Remove this seat"
                        >
                          <X size={11}/>
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
              {booking.snacks.length > 0 && (
                <div>
                  <span className="text-slate-400 font-medium">Snacks: </span>
                  {booking.snacks.map(s => <span key={s.id} className="text-slate-700 mr-3 text-xs">{s.name} ×{s.quantity}</span>)}
                </div>
              )}
              <div><span className="text-slate-400 font-medium">Email: </span><span className="text-slate-700 text-xs">{booking.user_email}</span></div>
              {booking.user_customer_number && (
                <div><span className="text-slate-400 font-medium">Customer ID: </span><span className="text-blue-600 text-xs font-mono font-semibold">{booking.user_customer_number}</span></div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [movies, setMovies] = useState([]);
  const [filters, setFilters] = useState({ movie_id: '', date: '', search: '' });

  const load = () => {
    const params = new URLSearchParams();
    if (filters.movie_id) params.append('movie_id', filters.movie_id);
    if (filters.date) params.append('date', filters.date);
    api.get(`/bookings/admin/all?${params}`).then(r => setBookings(r.data));
  };

  useEffect(() => { load(); api.get('/movies/all').then(r => setMovies(r.data)); }, []);
  useEffect(() => { load(); }, [filters.movie_id, filters.date]);

  const cancel = async (id) => {
    if (!confirm('Cancel this entire booking?')) return;
    await api.patch(`/bookings/${id}/cancel`); toast.success('Booking cancelled'); load();
  };

  const removeSeat = async (bookingId, seatId, seatLabel) => {
    if (!confirm(`Remove seat ${seatLabel} from this booking?`)) return;
    try {
      const res = await api.delete(`/bookings/${bookingId}/seats/${seatId}`);
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove seat');
    }
  };

  const filtered = bookings.filter(b =>
    !filters.search ||
    b.reference_number.toLowerCase().includes(filters.search.toLowerCase()) ||
    b.user_name.toLowerCase().includes(filters.search.toLowerCase()) ||
    b.movie_title.toLowerCase().includes(filters.search.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Bookings</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})}
            placeholder="Search reference, user, movie..."
            className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"/>
        </div>
        <select value={filters.movie_id} onChange={e => setFilters({...filters, movie_id: e.target.value})}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Movies</option>
          {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        <input type="date" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        {(filters.movie_id || filters.date || filters.search) && (
          <button onClick={() => setFilters({ movie_id: '', date: '', search: '' })} className="flex items-center gap-1 text-slate-500 text-sm hover:text-slate-700">
            <X size={16}/> Clear
          </button>
        )}
      </div>

      <div className="text-sm text-slate-500 mb-3">{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Reference', 'Movie', 'User', 'Showtime', 'Hall', 'Total', 'Status', 'Actions'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map(b => <BookingRow key={b.id} booking={b} onCancel={cancel} onRemoveSeat={removeSeat}/>)}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-slate-400">No bookings found</div>}
      </div>
    </div>
  );
}
