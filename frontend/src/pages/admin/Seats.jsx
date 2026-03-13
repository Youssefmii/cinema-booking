import { useEffect, useState } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { Armchair, Eye, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

const TYPE_STYLES = {
  vip:      { base: 'bg-amber-100 border-amber-400 text-amber-800',  selected: 'bg-amber-400 border-amber-500 text-white' },
  couple:   { base: 'bg-pink-100 border-pink-400 text-pink-800',     selected: 'bg-pink-400 border-pink-500 text-white'   },
  standard: { base: 'bg-slate-100 border-slate-300 text-slate-200',  selected: 'bg-blue-500 border-blue-600 text-white'   },
};
const BOOKED = 'bg-slate-200 border-slate-300 text-slate-400 opacity-60 cursor-not-allowed';

export default function AdminSeats() {
  const [halls, setHalls] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [selectedHall, setSelectedHall] = useState('');
  const [selectedShowtime, setSelectedShowtime] = useState('');
  const [seats, setSeats] = useState([]);
  const [mode, setMode] = useState('view');
  const [editingSeat, setEditingSeat] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/halls').then(r => setHalls(r.data));
    api.get('/showtimes/all').then(r => setShowtimes(r.data));
  }, []);

  useEffect(() => {
    if (!selectedHall) { setSeats([]); return; }
    loadSeats();
  }, [selectedHall, selectedShowtime]);

  const loadSeats = async () => {
    setLoading(true);
    try {
      if (selectedShowtime) {
        const res = await api.get(`/seats/showtime/${selectedShowtime}`);
        setSeats(res.data);
      } else {
        const res = await api.get(`/seats/hall/${selectedHall}`);
        setSeats(res.data.map(s => ({ ...s, is_booked: false })));
      }
    } finally { setLoading(false); }
  };

  const handleSeatClick = (seat) => {
    if (mode !== 'edit' || seat.is_booked) return;
    setEditingSeat(seat);
  };

  const changeSeatType = async (type) => {
    if (!editingSeat) return;
    try {
      await api.patch(`/seats/${editingSeat.id}/type`, { seat_type: type });
      toast.success(`${editingSeat.row_label}${editingSeat.seat_number} changed to ${type}`);
      setEditingSeat(null);
      loadSeats();
    } catch { toast.error('Failed to update seat type'); }
  };

  const rows = seats.reduce((acc, seat) => {
    if (!acc[seat.row_label]) acc[seat.row_label] = [];
    acc[seat.row_label].push(seat);
    return acc;
  }, {});

  const stats = {
    total: seats.length,
    standard: seats.filter(s => s.seat_type === 'standard').length,
    vip: seats.filter(s => s.seat_type === 'vip').length,
    couple: seats.filter(s => s.seat_type === 'couple').length,
    booked: seats.filter(s => s.is_booked).length,
    available: seats.filter(s => !s.is_booked).length,
  };

  const hallShowtimes = showtimes.filter(s => String(s.hall_id) === selectedHall);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Armchair size={24} className="text-blue-600" /> Seat Management
      </h1>

      <div className="bg-white/10 rounded-xl border border-white/15 p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Hall</label>
          <select value={selectedHall} onChange={e => { setSelectedHall(e.target.value); setSelectedShowtime(''); setEditingSeat(null); }}
            className="w-full px-3 py-2.5 rounded-xl border border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select a hall</option>
            {halls.map(h => <option key={h.id} value={h.id}>{h.name} ({h.rows * h.seats_per_row} seats)</option>)}
          </select>
        </div>
        {selectedHall && (
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Showtime — check availability</label>
            <select value={selectedShowtime} onChange={e => setSelectedShowtime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All seats (layout view)</option>
              {hallShowtimes.map(s => (
                <option key={s.id} value={s.id}>{s.movie_title} — {format(new Date(s.datetime), 'MMM d, h:mm a')}</option>
              ))}
            </select>
          </div>
        )}
        {selectedHall && (
          <div className="flex gap-2">
            <button onClick={() => { setMode('view'); setEditingSeat(null); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${mode === 'view' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/10 text-slate-400 border-white/15 hover:bg-white/10'}`}>
              <Eye size={15} /> View
            </button>
            <button onClick={() => { setMode('edit'); setSelectedShowtime(''); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${mode === 'edit' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white/10 text-slate-400 border-white/15 hover:bg-white/10'}`}>
              <Edit2 size={15} /> Edit Types
            </button>
          </div>
        )}
      </div>

      {mode === 'edit' && selectedHall && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 font-medium">
          Edit mode — click any seat to change its type. Booked seats cannot be changed.
          <span className="ml-2 text-amber-700">Couple seats are always set/unset in pairs (last 2 seats of each row).</span>
        </div>
      )}

      {!selectedHall ? (
        <div className="text-center py-20 bg-white/10 rounded-xl border border-white/15 text-slate-400">
          <Armchair size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Select a hall to view its seating layout</p>
        </div>
      ) : loading ? (
        <div className="text-center py-16 text-slate-400">Loading seats...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Total',    value: stats.total,    cls: 'bg-blue-500/10 text-blue-700'    },
              { label: 'Standard', value: stats.standard, cls: 'bg-slate-100 text-slate-200' },
              { label: 'VIP',      value: stats.vip,      cls: 'bg-amber-100 text-amber-700' },
              { label: 'Couple',   value: stats.couple,   cls: 'bg-pink-100 text-pink-700'   },
              ...(selectedShowtime ? [
                { label: 'Booked',    value: stats.booked,    cls: 'bg-red-500/20 text-red-300'     },
                { label: 'Available', value: stats.available, cls: 'bg-green-500/20 text-green-300' },
              ] : []),
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-3 text-center ${s.cls}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs font-semibold uppercase tracking-wide mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 mb-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border bg-slate-100 border-slate-300 inline-block"></span>Standard</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border bg-amber-100 border-amber-400 inline-block"></span>VIP</span>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border bg-pink-100 border-pink-400 inline-block"></span>Couple</span>
            {selectedShowtime && <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded border bg-slate-200 opacity-60 inline-block"></span>Booked</span>}
          </div>

          <div className="bg-white/10 rounded-xl border border-white/15 p-6 overflow-x-auto flex flex-col items-center">
            <div className="text-center mb-8 w-full">
              <div className="inline-block w-2/3 h-3 bg-gradient-to-b from-blue-200 to-blue-100 rounded-t-full"></div>
              <p className="text-xs text-slate-400 mt-1 tracking-widest uppercase">Screen</p>
            </div>
            <div className="min-w-max">
              {Object.entries(rows).map(([rowLabel, rowSeats]) => (
                <div key={rowLabel} className="flex items-center gap-1 mb-1.5">
                  <span className="w-7 text-xs text-slate-400 font-bold text-right mr-1">{rowLabel}</span>
                  {rowSeats.map(seat => {
                    const isBooked = seat.is_booked;
                    const isEditing = editingSeat && editingSeat.id === seat.id;
                    const style = isBooked ? BOOKED : isEditing ? TYPE_STYLES[seat.seat_type].selected : TYPE_STYLES[seat.seat_type].base;
                    return (
                      <button key={seat.id}
                        onClick={() => handleSeatClick(seat)}
                        disabled={isBooked || mode === 'view'}
                        title={`${rowLabel}${seat.seat_number} — ${seat.seat_type}${isBooked ? ' (booked)' : ''}`}
                        className={`seat-btn w-9 h-9 text-xs font-semibold rounded border ${style}${mode === 'edit' && !isBooked ? ' hover:scale-110 cursor-pointer' : ' cursor-default'}`}>
                        {seat.seat_number}
                      </button>
                    );
                  })}
                  <span className="w-7 text-xs text-slate-400 font-bold ml-1">{rowLabel}</span>
                </div>
              ))}
              <div className="flex items-center gap-1 mt-1 ml-8">
                {Object.values(rows)[0]?.map(s => (
                  <span key={s.id} className="w-9 text-xs text-slate-300 text-center">{s.seat_number}</span>
                ))}
              </div>
            </div>
          </div>

          {mode === 'edit' && editingSeat && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/10 rounded-2xl shadow-2xl border border-white/15 p-4 flex items-center gap-3 z-50">
              <span className="text-sm font-semibold text-slate-200">
                Change {editingSeat.row_label}{editingSeat.seat_number} to:
              </span>
              {['standard', 'vip', 'couple'].map(type => (
                <button key={type} onClick={() => changeSeatType(type)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border capitalize transition-colors ${
                    type === 'vip'    ? 'bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200' :
                    type === 'couple' ? 'bg-pink-100 border-pink-400 text-pink-800 hover:bg-pink-200' :
                                       'bg-slate-100 border-slate-300 text-slate-200 hover:bg-slate-200'
                  }`}>
                  {type}
                </button>
              ))}
              <button onClick={() => setEditingSeat(null)}
                className="ml-2 text-slate-400 hover:text-slate-400 text-xl font-bold leading-none">×</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
