import { useEffect, useState } from 'react';
import api from '../../api';
import { Film, Ticket, Building2, ShoppingBag, Users, TrendingUp } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white/10 rounded-xl border border-white/15 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-slate-500 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ movies: 0, bookings: 0, halls: 0, snacks: 0, users: 0, revenue: 0 });
  const [recentBookings, setRecentBookings] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/movies/all'),
      api.get('/bookings/admin/all'),
      api.get('/halls'),
      api.get('/snacks/all'),
      api.get('/users'),
    ]).then(([mv, bk, hl, sn, us]) => {
      const bookings = bk.data;
      const revenue = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + b.total_price, 0);
      setStats({ movies: mv.data.length, bookings: bookings.length, halls: hl.data.length, snacks: sn.data.length, users: us.data.length, revenue });
      setRecentBookings(bookings.slice(0, 8));
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Film} label="Movies" value={stats.movies} color="bg-blue-500" />
        <StatCard icon={Ticket} label="Bookings" value={stats.bookings} color="bg-green-500" />
        <StatCard icon={Building2} label="Halls" value={stats.halls} color="bg-purple-500" />
        <StatCard icon={ShoppingBag} label="Snack Items" value={stats.snacks} color="bg-orange-500" />
        <StatCard icon={Users} label="Users" value={stats.users} color="bg-pink-500" />
        <StatCard icon={TrendingUp} label="Revenue" value={`$${stats.revenue.toFixed(0)}`} color="bg-teal-500" />
      </div>

      <div>
        <h2 className="text-lg font-bold text-white mb-4">Recent Bookings</h2>
        <div className="bg-white/10 rounded-xl border border-white/15 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/15">
              <tr>
                {['Reference', 'Movie', 'User', 'Date', 'Total', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBookings.map(b => (
                <tr key={b.id} className="border-b border-white/10 hover:bg-white/10">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{b.reference_number}</td>
                  <td className="px-4 py-3 font-medium text-white">{b.movie_title}</td>
                  <td className="px-4 py-3 text-slate-400">{b.user_name}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(b.datetime).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-semibold text-blue-600">${b.total_price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${b.status === 'confirmed' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentBookings.length === 0 && <div className="text-center py-8 text-slate-400">No bookings yet</div>}
        </div>
      </div>
    </div>
  );
}
