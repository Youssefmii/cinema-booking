import { Link } from 'react-router-dom';
import { Clock, Tag } from 'lucide-react';
import { getGenreColors } from '../utils/genreColors';

export default function MovieCard({ movie }) {
  const genre = getGenreColors(movie.genre);
  const fallback = `https://placehold.co/300x450/1e3a5f/white?text=${encodeURIComponent(movie.title)}`;

  return (
    <Link to={`/movie/${movie.id}`} className="group bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 border border-white/15 hover:border-blue-500/50 flex flex-col">
      <div className="relative aspect-[2/3] overflow-hidden bg-slate-800">
        <img
          src={movie.poster_url || fallback}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => { e.target.src = fallback; }}
        />
        <div className={`absolute top-2 right-2 ${genre.bg} ${genre.text} text-xs font-semibold px-2 py-1 rounded-full`}>
          {movie.genre}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        <h3 className="font-bold text-white text-lg leading-tight group-hover:text-blue-300 transition-colors">{movie.title}</h3>
        <div className="flex items-center gap-3 text-slate-400 text-sm mt-1">
          <span className="flex items-center gap-1"><Clock size={14} />{movie.duration} min</span>
          <span className="flex items-center gap-1"><Tag size={14} />{movie.genre}</span>
        </div>
        <p className="text-slate-400 text-sm mt-2 line-clamp-2">{movie.description}</p>
        <div className="mt-auto pt-3">
          <span className="block w-full text-center bg-blue-500/20 text-blue-300 font-semibold text-sm py-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors border border-blue-500/30">
            Book Now
          </span>
        </div>
      </div>
    </Link>
  );
}
