import { useEffect, useState } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

export default function AdminHalls() {
  const [halls, setHalls] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', rows: 10, seats_per_row: 10 });
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/halls').then(r => setHalls(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ name: '', rows: 10, seats_per_row: 10 }); setModal('add'); };
  const openEdit = (h) => { setForm({ name: h.name, rows: h.rows, seats_per_row: h.seats_per_row }); setModal(h); };
  const close = () => setModal(null);

  const save = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/halls', { ...form, rows: Number(form.rows), seats_per_row: Number(form.seats_per_row) });
        toast.success('Hall created');
      } else {
        await api.put(`/halls/${modal.id}`, { name: form.name });
        toast.success('Hall updated');
      }
      load(); close();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this hall? This will remove all associated seats and showtimes.')) return;
    await api.delete(`/halls/${id}`); toast.success('Deleted'); load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Cinema Halls</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 text-sm">
          <Plus size={18}/> Add Hall
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {halls.map(h => (
          <div key={h.id} className="bg-white/10 rounded-xl border border-white/15 p-5">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-white text-lg">{h.name}</h3>
              <div className="flex gap-1">
                <button onClick={() => openEdit(h)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                <button onClick={() => del(h.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="font-bold text-white">{h.rows}</div>
                <div className="text-slate-500 text-xs">Rows</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="font-bold text-white">{h.seats_per_row}</div>
                <div className="text-slate-500 text-xs">Seats/Row</div>
              </div>
              <div className="col-span-2 bg-blue-500/10 rounded-lg p-2 text-center">
                <div className="font-bold text-blue-700">{h.rows * h.seats_per_row}</div>
                <div className="text-blue-500 text-xs">Total Seats</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Row A = VIP · Last 2 seats/row = Couple · Rest = Standard
            </div>
          </div>
        ))}
        {halls.length === 0 && <div className="col-span-3 text-center py-12 text-slate-400 bg-white/10 rounded-xl border border-white/15">No halls yet</div>}
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-white/15">
              <h2 className="font-bold text-white">{modal === 'add' ? 'Add Hall' : 'Edit Hall'}</h2>
              <button onClick={close}><X size={22} className="text-slate-400"/></button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Hall Name</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/15 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="e.g. Hall 1"/>
              </div>
              {modal === 'add' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">Number of Rows</label>
                    <input type="number" min="1" max="26" required value={form.rows} onChange={e => setForm({...form, rows: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-xl border border-white/15 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">Seats per Row</label>
                    <input type="number" min="1" max="30" required value={form.seats_per_row} onChange={e => setForm({...form, seats_per_row: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-xl border border-white/15 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    Row A will be VIP. Last 2 seats of each row will be Couple. All other seats are Standard.
                  </div>
                </>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={close} className="flex-1 py-2.5 border border-white/15 rounded-xl text-slate-400 font-medium">Cancel</button>
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
