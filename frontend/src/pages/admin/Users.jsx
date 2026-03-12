import { useEffect, useState } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, ShieldBan, ShieldCheck, X } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterBlacklisted, setFilterBlacklisted] = useState(false);

  const load = () => {
    api.get('/users').then(r => setUsers(r.data));
  };

  useEffect(() => { load(); }, []);

  const toggleBlacklist = async (userId, isCurrentlyBlacklisted) => {
    const action = isCurrentlyBlacklisted ? 'remove from blacklist' : 'blacklist';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      await api.patch(`/users/${userId}/blacklist`, { blacklisted: !isCurrentlyBlacklisted });
      toast.success(isCurrentlyBlacklisted ? 'User removed from blacklist' : 'User blacklisted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const filtered = users.filter(u => {
    const matchesSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.customer_number || '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter = !filterBlacklisted || u.is_blacklisted;
    return matchesSearch && matchesFilter;
  });

  const blacklistedCount = users.filter(u => u.is_blacklisted).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Users</h1>
        {blacklistedCount > 0 && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
            <ShieldBan size={14}/> {blacklistedCount} blacklisted
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, customer ID..."
            className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        <button
          onClick={() => setFilterBlacklisted(!filterBlacklisted)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            filterBlacklisted ? 'bg-red-50 border-red-200 text-red-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShieldBan size={15}/> Blacklisted only
        </button>
        {(search || filterBlacklisted) && (
          <button
            onClick={() => { setSearch(''); setFilterBlacklisted(false); }}
            className="flex items-center gap-1 text-slate-500 text-sm hover:text-slate-700"
          >
            <X size={16}/> Clear
          </button>
        )}
      </div>

      <div className="text-sm text-slate-500 mb-3">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Customer ID', 'Name', 'Email', 'Role', 'Joined', 'Status', 'Actions'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className={`border-b border-slate-100 hover:bg-slate-50 ${u.is_blacklisted ? 'bg-red-50/30' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{u.customer_number || '—'}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                </td>
                <td className="px-4 py-3">
                  {u.is_blacklisted ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      <ShieldBan size={11}/> Blacklisted
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => toggleBlacklist(u.id, !!u.is_blacklisted)}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        u.is_blacklisted
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {u.is_blacklisted
                        ? <><ShieldCheck size={13}/> Remove from Blacklist</>
                        : <><ShieldBan size={13}/> Blacklist</>
                      }
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-slate-400">No users found</div>}
      </div>
    </div>
  );
}
