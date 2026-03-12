import { useEffect, useState } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';

const empty = { title: '', genre: '', duration: '', description: '', poster_url: '', is_active: 1 };

export default function AdminMovies() {
  const [movies, setMovies] = useState([]);
  const [modal, setModal] = useState(null); // null | 'add' | movie object
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/movies/all').then(r => setMovies(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (m) => { setForm({ ...m, duration: String(m.duration) }); setModal(m); };
  const close = () => { setModal(null); };

  const save = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/movies', { ...form, duration: Number(form.duration) });
        toast.success('Movie added');
      } else {
        await api.put(`/movies/${modal.id}`, { ...form, duration: Number(form.duration) });
        toast.success('Movie updated');
      }
      load(); close();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this movie?')) return;
    await api.delete(`/movies/${id}`);
    toast.success('Deleted'); load();
  };

  const toggle = async (m) => {
    await api.put(`/movies/${m.id}`, { is_active: m.is_active ? 0 : 1 });
    toast.success(m.is_active ? 'Movie hidden' : 'Movie visible'); load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Movies</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 text-sm">
          <Plus size={18}/> Add Movie
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Poster', 'Title', 'Genre', 'Duration', 'Status', 'Actions'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {movies.map(m => (
              <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <img src={m.poster_url || `https://placehold.co/40x60/e2e8f0/94a3b8?text=${encodeURIComponent(m.title.slice(0,2))}`} alt="" className="w-10 h-14 object-cover rounded" onError={e => e.target.src=`https://placehold.co/40x60/e2e8f0/94a3b8?text=${encodeURIComponent(m.title.slice(0,2))}`}/>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-800">{m.title}</td>
                <td className="px-4 py-3 text-slate-600">{m.genre}</td>
                <td className="px-4 py-3 text-slate-600">{m.duration} min</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(m)} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {m.is_active ? 'Active' : 'Hidden'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(m)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                    <button onClick={() => del(m.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {movies.length === 0 && <div className="text-center py-10 text-slate-400">No movies yet</div>}
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="font-bold text-slate-800 text-lg">{modal === 'add' ? 'Add Movie' : 'Edit Movie'}</h2>
              <button onClick={close} className="text-slate-400 hover:text-slate-600"><X size={22}/></button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              {[
                { label: 'Title', key: 'title', type: 'text', required: true },
                { label: 'Genre', key: 'genre', type: 'text', required: true },
                { label: 'Duration (minutes)', key: 'duration', type: 'number', required: true },
                { label: 'Poster URL', key: 'poster_url', type: 'url', required: false },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                  <input type={f.type} required={f.required} value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={close} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-70">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
