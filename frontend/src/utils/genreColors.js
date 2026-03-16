const GENRE_MAP = {
  Action:    { bg: 'bg-red-600',    text: 'text-white',    bgLight: 'bg-red-500/20',    textLight: 'text-red-300',    border: 'border-red-500/30' },
  Thriller:  { bg: 'bg-purple-600', text: 'text-white',    bgLight: 'bg-purple-500/20', textLight: 'text-purple-300', border: 'border-purple-500/30' },
  'Sci-Fi':  { bg: 'bg-cyan-600',   text: 'text-white',    bgLight: 'bg-cyan-500/20',   textLight: 'text-cyan-300',   border: 'border-cyan-500/30' },
  Animation: { bg: 'bg-green-600',  text: 'text-white',    bgLight: 'bg-green-500/20',  textLight: 'text-green-300',  border: 'border-green-500/30' },
  Comedy:    { bg: 'bg-yellow-500', text: 'text-black',    bgLight: 'bg-yellow-500/20', textLight: 'text-yellow-300', border: 'border-yellow-500/30' },
  Drama:     { bg: 'bg-orange-600', text: 'text-white',    bgLight: 'bg-orange-500/20', textLight: 'text-orange-300', border: 'border-orange-500/30' },
  Horror:    { bg: 'bg-rose-800',   text: 'text-white',    bgLight: 'bg-rose-500/20',   textLight: 'text-rose-300',   border: 'border-rose-500/30' },
  Romance:   { bg: 'bg-pink-600',   text: 'text-white',    bgLight: 'bg-pink-500/20',   textLight: 'text-pink-300',   border: 'border-pink-500/30' },
};

const DEFAULT = { bg: 'bg-blue-600', text: 'text-white', bgLight: 'bg-blue-500/20', textLight: 'text-blue-300', border: 'border-blue-500/30' };

export function getGenreColors(genre) {
  return GENRE_MAP[genre] || DEFAULT;
}
