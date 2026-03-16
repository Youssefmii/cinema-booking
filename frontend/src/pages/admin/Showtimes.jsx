import { useEffect, useState } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const now = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const emptyForm = { movie_id: '', hall_id: '', datetime: '', price_standard: 12, price_vip: 22, price_couple: 35, recurring: false, repeat_type: 'daily', repeat_count: 7 };

export default function AdminShowtimes() {
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [halls, setHalls] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/showtimes/all').then(r => {
    const now = new Date();
    setShowtimes(r.data.filter(s => new Date(s.datetime) > now));
  });
  useEffect(() => {
    load();
    api.get('/movies/all').then(r => setMovies(r.data.filter(m => m.is_active)));
    api.get('/halls').then(r => setHalls(r.data));
  }, []);

  const save = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const base = {
        movie_id: Number(form.movie_id),
        hall_id: Number(form.hall_id),
        price_standard: Number(form.price_standard),
        price_vip: Number(form.price_vip),
        price_couple: Number(form.price_couple),
      };

      if (form.recurring) {
        // Build array of datetimes — keep the local time as-is, only change the date
        const datetimes = [];
        const [datePart, timePart] = form.datetime.split('T');
        const startDate = new Date(datePart + 'T00:00:00');
        const count = Math.min(Number(form.repeat_count), 60);
        const stepDays = form.repeat_type === 'weekly' ? 7 : 1;
        for (let i = 0; i < count; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i * stepDays);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          datetimes.push(`${yyyy}-${mm}-${dd}T${timePart}`);
        }
        // Create each showtime sequentially
        for (const dt of datetimes) {
          await api.post('/showtimes', { ...base, datetime: dt });
        }
        toast.success(`${datetimes.length} showtimes created`);
      } else {
        await api.post('/showtimes', { ...base, datetime: form.datetime });
        toast.success('Showtime added');
      }

      load();
      setModal(false);
      setForm(emptyForm);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this showtime? Any associated bookings will also be removed.')) return;
    try {
      await api.delete(`/showtimes/${id}`);
      toast.success('Showtime deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete showtime');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Showtimes</h1>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 text-sm">
          <Plus size={18}/> Add Showtime
        </button>
      </div>

      <div className="bg-white/10 rounded-xl border border-white/15 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 border-b border-white/15">
            <tr>{['Movie', 'Hall', 'Date & Time', 'Standard', 'VIP', 'Couple', 'Action'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {showtimes.map(st => (
              <tr key={st.id} className="border-b border-white/10 hover:bg-white/10">
                <td className="px-4 py-3 font-medium text-white">{st.movie_title}</td>
                <td className="px-4 py-3 text-slate-400">{st.hall_name}</td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{format(new Date(st.datetime), 'MMM d, yyyy h:mm a')}</td>
                <td className="px-4 py-3 text-slate-200">${st.price_standard}</td>
                <td className="px-4 py-3 text-amber-600">${st.price_vip}</td>
                <td className="px-4 py-3 text-pink-600">${st.price_couple}</td>
                <td className="px-4 py-3">
                  <button onClick={() => del(st.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {showtimes.length === 0 && <div className="text-center py-10 text-slate-400">No showtimes yet</div>}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-xl border border-white/15 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/15">
              <h2 className="font-bold text-white">Add Showtime</h2>
              <button onClick={() => { setModal(false); setForm(emptyForm); }}><X size={22} className="text-slate-400"/></button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Movie</label>
                <select required value={form.movie_id} onChange={e => setForm({...form, movie_id: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/15 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">Select movie</option>
                  {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Hall</label>
                <select required value={form.hall_id} onChange={e => setForm({...form, hall_id: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/15 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">Select hall</option>
                  {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  {form.recurring ? 'Start Date & Time' : 'Date & Time'}
                </label>
                <input type="datetime-local" required
                  min={now()}
                  value={form.datetime}
                  onChange={e => setForm({...form, datetime: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/15 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
              </div>

              {/* Recurring toggle */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/15">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.recurring} onChange={e => setForm({...form, recurring: e.target.checked})}
                    className="w-4 h-4 accent-blue-600"/>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
                    <RefreshCw size={15}/> Recurring showtime
                  </span>
                </label>
                {form.recurring && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Repeat every</label>
                      <select value={form.repeat_type} onChange={e => setForm({...form, repeat_type: e.target.value})}
                        className="w-full px-3 py-2 rounded-lg border border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="daily">Day</option>
                        <option value="weekly">Week</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Number of times</label>
                      <input type="number" min="2" max="60" value={form.repeat_count}
                        onChange={e => setForm({...form, repeat_count: e.target.value})}
                        className="w-full px-3 py-2 rounded-lg border border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[['price_standard','Standard ($)'],['price_vip','VIP ($)'],['price_couple','Couple ($)']].map(([k,l]) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-slate-200 mb-1">{l}</label>
                    <input type="number" min="0" step="0.5" required value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-xl border border-white/15 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setModal(false); setForm(emptyForm); }} className="flex-1 py-2.5 border border-white/15 rounded-xl text-slate-400 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-70">
                  {saving ? 'Saving...' : form.recurring ? `Create ${form.repeat_count} Showtimes` : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
