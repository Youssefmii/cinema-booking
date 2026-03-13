import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useBooking } from '../context/BookingContext';
import { Plus, Minus, ChevronRight, ShoppingBag } from 'lucide-react';

const CATEGORY_ICONS = { food: '🍿', drinks: '🥤', candy: '🍬', other: '🛍️' };

export default function SnackSelection() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const { bookingData, setSnacks } = useBooking();
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    if (!bookingData.showtime) { navigate(`/booking/${showtimeId}/seats`); return; }
    api.get('/snacks').then(r => setAvailable(r.data)).finally(() => setLoading(false));
  }, []);

  const change = (id, delta) => {
    setQuantities(prev => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleContinue = () => {
    const selected = available
      .filter(s => quantities[s.id] > 0)
      .map(s => ({ ...s, quantity: quantities[s.id] }));
    setSnacks(selected);
    navigate(`/booking/${showtimeId}/summary`);
  };

  const categories = [...new Set(available.map(s => s.category))];
  const snackTotal = available.reduce((sum, s) => sum + (quantities[s.id] || 0) * s.price, 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag size={24} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-white">Add Snacks</h1>
        <span className="text-slate-400 text-sm">— Optional</span>
      </div>

      {categories.map(cat => (
        <div key={cat} className="mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            {CATEGORY_ICONS[cat] || '🛍️'} {cat}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {available.filter(s => s.category === cat).map(snack => {
              const qty = quantities[snack.id] || 0;
              return (
                <div key={snack.id} className="bg-white/10 border border-white/15 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{snack.name}</div>
                    <div className="text-blue-600 font-semibold text-sm">${snack.price.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => change(snack.id, -1)} disabled={qty === 0} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white/20 disabled:opacity-40">
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center font-semibold text-slate-200">{qty}</span>
                    <button onClick={() => change(snack.id, 1)} className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-700">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {snackTotal > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-4 text-sm text-blue-300 font-medium">
          Snacks total: <strong>${snackTotal.toFixed(2)}</strong>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleContinue} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
          Continue to Summary <ChevronRight size={20} />
        </button>
        <button onClick={() => { setSnacks([]); navigate(`/booking/${showtimeId}/summary`); }}
          className="py-3 px-5 border border-slate-200 text-slate-400 rounded-xl font-medium hover:bg-white/10">
          Skip
        </button>
      </div>
    </div>
  );
}
