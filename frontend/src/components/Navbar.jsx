import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Film, Ticket, User, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setOpen(false); };

  return (
    <nav className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-black text-xl tracking-tight text-white hover:text-blue-300 transition-colors">
          <Film size={24} />
          <span>cinemabooking</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/" className="text-white/90 hover:text-blue-300 font-medium text-sm transition-colors">Movies</Link>
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-1 text-white/90 hover:text-blue-300 font-medium text-sm">
                  <LayoutDashboard size={16} /> Admin
                </Link>
              )}
              <Link to="/profile" className="flex items-center gap-1 text-white/90 hover:text-blue-300 font-medium text-sm">
                <Ticket size={16} /> My Bookings
              </Link>
              <div className="flex items-center gap-2 ml-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/80 flex items-center justify-center text-white font-semibold text-sm">
                  {user.name[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-white/90">{user.name}</span>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-red-300 hover:text-red-200 font-medium">
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600">Login</Link>
              <Link to="/register" className="bg-blue-500/90 backdrop-blur text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">Sign Up</Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-slate-600" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-black/40 backdrop-blur-md px-4 pb-4 flex flex-col gap-3">
          <Link to="/" className="text-white/90 font-medium py-2" onClick={() => setOpen(false)}>Movies</Link>
          {user ? (
            <>
              {isAdmin && <Link to="/admin" className="text-white/90 font-medium py-2" onClick={() => setOpen(false)}>Admin Panel</Link>}
              <Link to="/profile" className="text-white/90 font-medium py-2" onClick={() => setOpen(false)}>My Bookings</Link>
              <button onClick={handleLogout} className="text-left text-red-500 font-medium py-2">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-white/90 font-medium py-2" onClick={() => setOpen(false)}>Login</Link>
              <Link to="/register" className="text-blue-600 font-semibold py-2" onClick={() => setOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
