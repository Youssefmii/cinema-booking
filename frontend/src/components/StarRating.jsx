import { useState } from 'react';
import { Star } from 'lucide-react';

// Display only
export function Stars({ rating, size = 16 }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 fill-slate-100'}
        />
      ))}
    </span>
  );
}

// Interactive picker
export default function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 focus:outline-none"
        >
          <Star
            size={24}
            className={i <= active ? 'text-amber-400 fill-amber-400' : 'text-slate-300 fill-slate-100'}
          />
        </button>
      ))}
    </span>
  );
}
