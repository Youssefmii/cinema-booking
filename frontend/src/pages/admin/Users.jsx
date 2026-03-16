import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, ShieldBan, ShieldCheck, X, UserPlus, Trash2, Ticket, Pencil } from 'lucide-react';

const emptyForm = { name: '', email: '', password: '', role: 'user' };

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterBlacklisted, setFilterBlacklisted] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, name: '', email: '', role: 'user' });

  const load = () => api.get('/users').then(r => setUsers(r.data));
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

  const deleteUser = async (userId, userName) => {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete user');
    }
  };

  const openEdit = (u) => {
    setEditForm({ id: u.id, name: u.name, email: u.email, role: u.role });
    setEditModal(true);
  };

  const updateUser = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/users/${editForm.id}`, { name: editForm.name, email: editForm.email, role: editForm.role });
      toast.success('User updated');
      setEditModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update user');
    } finally { setSaving(false); }
  };

  const createUser = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/users', form);
      toast.success(`User "${res.data.name}" created`);
      setModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create user');
    } finally { setSaving(false); }
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
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <div className="flex items-center gap-3">
          {blacklistedCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
              <ShieldBan size={14}/> {blacklistedCount} blacklisted
            </span>
          )}
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 text-sm"
          >
            <UserPlus size={16}/> Add User
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, customer ID..."
            className="pl-9 pr-4 py-2.5 rounded-xl border border-white/15 bg-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        <button
          onClick={() => setFilterBlacklisted(!filterBlacklisted)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            filterBlacklisted ? 'bg-red-50 border-red-200 text-red-700' : 'border-white/15 text-slate-400 hover:bg-white/10'
          }`}
        >
          <ShieldBan size={15}/> Blacklisted only
        </button>
        {(search || filterBlacklisted) && (
          <button onClick={() => { setSearch(''); setFilterBlacklisted(false); }} className="flex items-center gap-1 text-slate-500 text-sm hover:text-slate-200">
            <X size={16}/> Clear
          </button>
        )}
      </div>

      <div className="text-sm text-slate-500 mb-3">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</div>

      <div className="bg-white/10 rounded-xl border border-white/15 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 border-b border-white/15">
            <tr>{['Customer ID', 'Name', 'Email', 'Role', 'Joined', 'Status', 'Actions'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase whitespace-nowrap">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className={`border-b border-white/10 hover:bg-white/10 ${u.is_blacklisted ? 'bg-red-50/30' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">{u.customer_number || '—'}</td>
                <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                </td>
                <td className="px-4 py-3">
                  {u.is_blacklisted ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300">
                      <ShieldBan size={11}/> Blacklisted
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-300">Active</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.role !== 'admin' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(u)}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-500/10 text-slate-300 hover:bg-slate-500/20 transition-colors"
                        title="Edit user details"
                      >
                        <Pencil size={12}/> Edit
                      </button>
                      <button
                        onClick={() => navigate('/admin/book-for-user', { state: { preselectedUser: u } })}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-700 hover:bg-blue-100 transition-colors"
                        title="Book a ticket for this user"
                      >
                        <Ticket size={12}/> Book
                      </button>
                      <button
                        onClick={() => toggleBlacklist(u.id, !!u.is_blacklisted)}
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                          u.is_blacklisted
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                        }`}
                      >
                        {u.is_blacklisted ? <><ShieldCheck size={12}/> Unblock</> : <><ShieldBan size={12}/> Block</>}
                      </button>
                      <button
                        onClick={() => deleteUser(u.id, u.name)}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={12}/> Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-slate-400">No users found</div>}
      </div>

      {/* Add User Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-xl border border-white/15">
            <div className="flex items-center justify-between p-5 border-b border-white/15">
              <h2 className="font-bold text-white flex items-center gap-2"><UserPlus size={18}/> Add New User</h2>
              <button onClick={() => { setModal(false); setForm(emptyForm); }}><X size={22} className="text-slate-400"/></button>
            </div>
            <form onSubmit={createUser} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Full Name</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="John Smith"
                  className="w-full px-3 py-2.5 rounded-xl border border-white/15 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Email</label>
                <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="john@gmail.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-white/15 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Password</label>
                <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/15 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/15 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setModal(false); setForm(emptyForm); }}
                  className="flex-1 py-2.5 border border-white/15 rounded-xl text-slate-400 font-medium hover:bg-white/10">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-70">
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-xl border border-white/15">
            <div className="flex items-center justify-between p-5 border-b border-white/15">
              <h2 className="font-bold text-white flex items-center gap-2"><Pencil size={18}/> Edit User</h2>
              <button onClick={() => setEditModal(false)}><X size={22} className="text-slate-400"/></button>
            </div>
            <form onSubmit={updateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Full Name</label>
                <input required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/15 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Email</label>
                <input required type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/15 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Role</label>
                <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/15 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditModal(false)}
                  className="flex-1 py-2.5 border border-white/15 rounded-xl text-slate-400 font-medium hover:bg-white/10">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-70">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
