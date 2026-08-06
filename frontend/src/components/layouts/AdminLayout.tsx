import { AlertTriangle, CalendarDays, Home, Settings, Shield, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: Home },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Providers', to: '/admin/providers', icon: Shield },
  { label: 'Bookings', to: '/admin/bookings', icon: CalendarDays },
  { label: 'Disputes', to: '/admin/disputes', icon: AlertTriangle },
  { label: 'Categories', to: '/admin/categories', icon: Users },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

const AdminLayout = () => (
  <div className="admin-shell">
    <aside className="sidebar card">
      <div>
        <p className="eyebrow">Admin</p>
        <h2>Marketplace Ops</h2>
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
    <main className="page-content admin-content">
      <Outlet />
    </main>
  </div>
);

export default AdminLayout;
