import { NavLink, Outlet } from 'react-router-dom';
import { Film, Clock, Building2, ShoppingBag, Ticket, LayoutDashboard, Armchair, UserCheck, Users, BellRing } from 'lucide-react';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/movies', label: 'Movies', icon: Film },
  { to: '/admin/showtimes', label: 'Showtimes', icon: Clock },
  { to: '/admin/halls', label: 'Halls', icon: Building2 },
  { to: '/admin/snacks', label: 'Snacks', icon: ShoppingBag },
  { to: '/admin/bookings', label: 'Bookings', icon: Ticket },
  { to: '/admin/seats', label: 'Seats', icon: Armchair },
  { to: '/admin/book-for-user', label: 'Book for User', icon: UserCheck },
  { to: '/admin/waitlist', label: 'Waitlist', icon: BellRing },
  { to: '/admin/users', label: 'Users', icon: Users },
];

export default function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="w-56 bg-white/5 border-r border-white/10 flex-shrink-0 hidden md:block">
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Admin Panel</p>
          <nav className="space-y-1">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  }`
                }>
                <Icon size={18}/> {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden w-full border-b border-white/10 bg-white/5 overflow-x-auto">
        <div className="flex gap-1 p-2 min-w-max">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400'
                }`
              }>
              <Icon size={14}/> {label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
