import { useEffect, useState } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { BellRing, Trash2, Search } from 'lucide-react';

export default function AdminWaitlist() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');

  const load = () => api.get('/waitlist/admin/all').then(r => setEntries(r.data));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm('Remove this user from the waitlist?')) return;
    try {
      await api.delete(`/waitlist/admin/${id}`);
      toast.success('Removed from waitlist');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove');
    }
  };

  const filtered = entries.filter(e =>
    !search ||
    e.user_name.toLowerCase().includes(search.toLowerCase()) ||
    e.user_email.toLowerCase().includes(search.toLowerCase()) ||
    e.movie_title.toLowerCase().includes(search.toLowerCase())
  );

  const waiting = entries.filter(e => e.status === 'waiting').length;
  const notified = entries.filter(e => e.status === 'notified').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BellRing size={24} className="text-blue-600" /> Waitlist
        </h1>
        <div className="flex items-center gap-3">
          {waiting > 0 && (
            <span className="text-sm font-medium text-amber-300 bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-full">
              {waiting} waiting
            </span>
          )}
          {notified > 0 && (
            <span className="text-sm font-medium text-green-300 bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded-full">
              {notified} notified
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search user, email, movie..."
            className="pl-9 pr-4 py-2.5 rounded-xl border border-white/15 bg-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
      </div>

      <div className="text-sm text-slate-500 mb-3">{filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}</div>

      <div className="bg-white/10 rounded-xl border border-white/15 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 border-b border-white/15">
            <tr>
              {['User', 'Email', 'Movie', 'Showtime', 'Hall', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-b border-white/10 hover:bg-white/10">
                <td className="px-4 py-3 font-medium text-white">{e.user_name}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{e.user_email}</td>
                <td className="px-4 py-3 text-white">{e.movie_title}</td>
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">{format(new Date(e.datetime), 'MMM d · h:mm a')}</td>
                <td className="px-4 py-3 text-slate-400">{e.hall_name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    e.status === 'waiting' ? 'bg-amber-500/20 text-amber-300' :
                    e.status === 'notified' ? 'bg-green-500/20 text-green-300' :
                    'bg-slate-500/20 text-slate-300'
                  }`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                  {e.created_at ? format(new Date(e.created_at), 'MMM d, yyyy') : '—'}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => remove(e.id)} className="p-1.5 text-slate-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <BellRing size={32} className="mx-auto mb-2 opacity-30" />
            No waitlist entries
          </div>
        )}
      </div>
    </div>
  );
}
