import { useEffect, useState } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

const empty = { name: '', price: '', category: 'food', image_url: '', is_available: 1 };
const CATEGORIES = ['food', 'drinks', 'candy', 'other'];

export default function AdminSnacks() {
  const [snacks, setSnacks] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/snacks/all').then(r => setSnacks(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (s) => { setForm({ ...s, price: String(s.price) }); setModal(s); };
  const close = () => setModal(null);

  const save = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/snacks', { ...form, price: Number(form.price) });
        toast.success('Snack added');
      } else {
        await api.put(`/snacks/${modal.id}`, { ...form, price: Number(form.price) });
        toast.success('Snack updated');
      }
      load(); close();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this snack?')) return;
    await api.delete(`/snacks/${id}`); toast.success('Deleted'); load();
  };

  const toggle = async (s) => {
    await api.put(`/snacks/${s.id}`, { is_available: s.is_available ? 0 : 1 });
    toast.success(s.is_available ? 'Snack hidden' : 'Snack available'); load();
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = snacks.filter(s => s.category === cat);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Snack Menu</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 text-sm">
          <Plus size={18}/> Add Item
        </button>
      </div>

      {CATEGORIES.map(cat => grouped[cat].length > 0 && (
        <div key={cat} className="mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 capitalize">{cat}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[cat].map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">{s.name}</div>
                  <div className="text-blue-600 font-semibold text-sm">${s.price.toFixed(2)}</div>
                  <button onClick={() => toggle(s)} className={`mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.is_available ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {s.is_available ? 'Available' : 'Hidden'}
                  </button>
                </div>
                <div className="flex gap-1 ml-4">
                  <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                  <button onClick={() => del(s.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {snacks.length === 0 && <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">No snacks yet</div>}

      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="font-bold text-slate-800">{modal === 'add' ? 'Add Snack' : 'Edit Snack'}</h2>
              <button onClick={close}><X size={22} className="text-slate-400"/></button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="e.g. Large Popcorn"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
                  <input type="number" min="0" step="0.5" required value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={close} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-70">
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
