import { useEffect, useState } from 'react';
import MovieCard from '../components/MovieCard';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../api';
import { Search, Film } from 'lucide-react';

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');

  useEffect(() => {
    api.get('/movies').then(r => setMovies(r.data)).finally(() => setLoading(false));
  }, []);

  const genres = [...new Set(movies.map(m => m.genre))];
  const filtered = movies.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) &&
    (genre === '' || m.genre === genre)
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-10 -mx-4 -mt-8 px-4 pt-16 pb-12 text-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700 rounded-b-3xl shadow-lg">
        <h1 className="text-4xl font-bold text-white mb-3">Now Showing</h1>
        <p className="text-slate-300 text-lg">Choose your movie, pick your seat, enjoy the show</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search movies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={genre}
          onChange={e => setGenre(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="" className="bg-slate-800">All Genres</option>
          {genres.map(g => <option key={g} value={g} className="bg-slate-800">{g}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-300">
          <Film size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No movies found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {filtered.map(movie => <MovieCard key={movie.id} movie={movie} />)}
        </div>
      )}
    </div>
  );
}
